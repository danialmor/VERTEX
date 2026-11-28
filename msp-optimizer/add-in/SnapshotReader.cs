using System;
using System.Collections.Generic;
using MSP = Microsoft.Office.Interop.MSProject;
namespace UniversalMspOptimizer {
public sealed class TaskSnapshot {
 public int UniqueId, OutlineLevel, PercentComplete;
 public string Name, Wbs, Start, Finish, ActualStart, ActualFinish, Predecessors, ProtectionReason;
 public double RemainingMinutes, ActualMinutes;
 public bool Summary, Milestone, Eligible;
 public Dictionary<string,object> Extra=new Dictionary<string,object>();
}
public sealed class ProjectSnapshot {
 public string Name;
 public Dictionary<string,object> Extra=new Dictionary<string,object>();
 public List<Dictionary<string,object>> Resources=new List<Dictionary<string,object>>();
 public List<Dictionary<string,object>> Assignments=new List<Dictionary<string,object>>();
 public List<string> ReadWarnings=new List<string>();
 public int SchemaVersion=2;
 public bool Extended;
 public Dictionary<string,object> FieldCatalog=new Dictionary<string,object>();
 public Dictionary<string,int> FieldFailures=new Dictionary<string,int>();
 public List<TaskSnapshot> Tasks=new List<TaskSnapshot>();
}
public static class SnapshotReader {
 static string Field(object v) { return Convert.ToString(v,System.Globalization.CultureInfo.InvariantCulture) ?? ""; }
 static bool HasActualDate(object v) { if(v is DateTime) return true; string s=Field(v).Trim(); return s!="" && !s.Equals("NA",StringComparison.OrdinalIgnoreCase) && !s.Equals("N/A",StringComparison.OrdinalIgnoreCase); }
 static void Capture(object source, Dictionary<string,object> target, List<string> warnings, string context, params string[] fields) {
 foreach(string field in fields) {
 try {
 object v=source.GetType().InvokeMember(field,System.Reflection.BindingFlags.GetProperty,null,source,null,System.Globalization.CultureInfo.InvariantCulture);
 if(v is DateTime) target[field]=((DateTime)v).ToString("yyyy-MM-ddTHH:mm:ss",System.Globalization.CultureInfo.InvariantCulture);
 else if(v==null || v is string || v is bool || v is int || v is double || v is decimal || v is float || v is short || v is long) target[field]=v;
 else target[field]=Field(v);
 } catch(Exception) { target[field]=null; if(warnings.Count<200) warnings.Add(context+"."+field+": unavailable"); }
 }
 }
 // Enumerate local custom field families by stable PjField identifiers, not localized captions.
 static void Custom(object source, Dictionary<string,object> target, ProjectSnapshot result, string entity) {
 var values=new Dictionary<string,object>(); target["CustomFields"]=values;
 string[] families={"Text:30","Number:20","Date:10","Start:10","Finish:10","Duration:10","Flag:20","Cost:10","OutlineCode:10"};
 foreach(string family in families) {
 var parts=family.Split(':'); int count=int.Parse(parts[1]);
 for(int i=1;i<=count;i++) {
 string name="pj"+entity+parts[0]+i; MSP.PjField field;
 if(!Enum.TryParse<MSP.PjField>(name,out field)) continue;
 string id=((int)field).ToString(System.Globalization.CultureInfo.InvariantCulture);
 if(!result.FieldCatalog.ContainsKey(id)) result.FieldCatalog[id]=new Dictionary<string,object>{{"Id",(int)field},{"Constant",name},{"Entity",entity},{"Type",parts[0]}};
 try { dynamic item=source; values[id]=Field(item.GetField(field)); }
 catch(Exception) { values[id]=null; int n; result.FieldFailures.TryGetValue(id,out n); result.FieldFailures[id]=n+1; }
 }
 }
 }
 public static ProjectSnapshot Read(MSP.Project project, bool extended=false, MSP.Application application=null) {
 var result=new ProjectSnapshot { Name=project.Name, Extended=extended };
 Capture(project,result.Extra,result.ReadWarnings,"Project","Start","Finish","StatusDate","CurrencySymbol","MinutesPerDay","MinutesPerWeek");
 foreach(MSP.Task t in project.Tasks) {
 if(t==null) continue;
 var row=new TaskSnapshot { UniqueId=t.UniqueID, Name=t.Name, Wbs=t.WBS, OutlineLevel=t.OutlineLevel, Summary=t.Summary, Milestone=t.Milestone, PercentComplete=t.PercentComplete, Start=Field(t.Start), Finish=Field(t.Finish), ActualStart=Field(t.ActualStart), ActualFinish=Field(t.ActualFinish), Predecessors=Field(t.Predecessors), RemainingMinutes=Convert.ToDouble(t.RemainingDuration), ActualMinutes=Convert.ToDouble(t.ActualDuration) };
 var reasons=new List<string>();
 if(row.Summary) reasons.Add("Summary");
 if(row.Milestone) reasons.Add("Milestone");
 if(row.PercentComplete!=0 || row.ActualMinutes!=0 || HasActualDate(t.ActualStart) || HasActualDate(t.ActualFinish) || Convert.ToDouble(t.ActualWork)!=0) reasons.Add("Actual");
 if(row.RemainingMinutes<=0) reasons.Add("No remaining duration");
 // Conservative candidate classification only. Further constraints, calendars, external links and assignments must be validated before any write.
 row.Eligible=reasons.Count==0; row.ProtectionReason=string.Join(", ",reasons);
 Capture(t,row.Extra,result.ReadWarnings,"Task "+row.UniqueId,"ID","Duration","Work","ActualWork","RemainingWork","Cost","ActualCost","RemainingCost","BaselineCost","BaselineStart","BaselineFinish","BaselineDuration","BaselineWork","BCWS","BCWP","ACWP","SPI","CPI","Critical","TotalSlack","FreeSlack","Successors","ConstraintType","ConstraintDate","Deadline","PhysicalPercentComplete","Manual","Calendar");
 if(extended) {
 Custom(t,row.Extra,result,"Task");
 Capture(t,row.Extra,result.ReadWarnings,"Task "+row.UniqueId,"Notes","Priority","Active","ExternalTask","TaskMode","ActualOvertimeWork","OvertimeWork","FixedCost","FixedCostAccrual","RemainingOvertimeWork","PercentWorkComplete","ActualCost","CostVariance","WorkVariance","StartVariance","FinishVariance","SV","CV","EAC","VAC","TCPI");
 for(int b=1;b<=10;b++) { string prefix="Baseline"+b; Capture(t,row.Extra,result.ReadWarnings,"Task "+row.UniqueId,prefix+"Start",prefix+"Finish",prefix+"Duration",prefix+"Work",prefix+"Cost"); }
 }
 result.Tasks.Add(row);
 }
 foreach(MSP.Resource resource in project.Resources) {
 if(resource==null) continue;
 var row=new Dictionary<string,object>();
 Capture(resource,row,result.ReadWarnings,"Resource","UniqueID","ID","Name","Type","MaxUnits","Work","ActualWork","RemainingWork","Cost","ActualCost","BaselineCost","StandardRate","OvertimeRate");
 if(extended) { Custom(resource,row,result,"Resource"); Capture(resource,row,result.ReadWarnings,"Resource","Group","Code","Initials","MaterialLabel","CostPerUse","AccrueAt","PeakUnits","Overallocated","Notes"); for(int b=1;b<=10;b++) Capture(resource,row,result.ReadWarnings,"Resource","Baseline"+b+"Work","Baseline"+b+"Cost"); }
 result.Resources.Add(row);
 }
 foreach(MSP.Task task in project.Tasks) {
 if(task==null) continue;
 foreach(MSP.Assignment assignment in task.Assignments) {
 if(assignment==null) continue;
 var row=new Dictionary<string,object>(); row["TaskUniqueID"]=task.UniqueID;
 Capture(assignment,row,result.ReadWarnings,"Assignment","UniqueID","ResourceUniqueID","ResourceName","Start","Finish","Units","Work","ActualWork","RemainingWork","Cost","ActualCost","BaselineCost");
 if(extended) { Capture(assignment,row,result.ReadWarnings,"Assignment","ActualStart","ActualFinish","ActualOvertimeWork","OvertimeWork","RemainingOvertimeWork","PercentWorkComplete","BaselineStart","BaselineFinish","BaselineWork","CostVariance","WorkVariance"); for(int b=1;b<=10;b++) Capture(assignment,row,result.ReadWarnings,"Assignment","Baseline"+b+"Start","Baseline"+b+"Finish","Baseline"+b+"Work","Baseline"+b+"Cost"); }
 result.Assignments.Add(row);
 }
 }
 if(extended && application!=null) foreach(var entry in result.FieldCatalog) { var meta=(Dictionary<string,object>)entry.Value; var field=(MSP.PjField)(int)meta["Id"]; dynamic a=application; try { meta["DisplayName"]=Field(a.FieldConstantToFieldName(field)); } catch { meta["DisplayName"]=null; } try { meta["Alias"]=Field(a.CustomFieldGetName(field)); } catch { meta["Alias"]=null; } try { meta["Formula"]=Field(a.CustomFieldGetFormula(field)); } catch { meta["Formula"]=null; } }
 return result;
 }
}
}