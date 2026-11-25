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
 public static ProjectSnapshot Read(MSP.Project project) {
 var result=new ProjectSnapshot { Name=project.Name };
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
 result.Tasks.Add(row);
 }
 foreach(MSP.Resource resource in project.Resources) {
 if(resource==null) continue;
 var row=new Dictionary<string,object>();
 Capture(resource,row,result.ReadWarnings,"Resource","UniqueID","ID","Name","Type","MaxUnits","Work","ActualWork","RemainingWork","Cost","ActualCost","BaselineCost","StandardRate","OvertimeRate");
 result.Resources.Add(row);
 }
 foreach(MSP.Task task in project.Tasks) {
 if(task==null) continue;
 foreach(MSP.Assignment assignment in task.Assignments) {
 if(assignment==null) continue;
 var row=new Dictionary<string,object>(); row["TaskUniqueID"]=task.UniqueID;
 Capture(assignment,row,result.ReadWarnings,"Assignment","UniqueID","ResourceUniqueID","ResourceName","Start","Finish","Units","Work","ActualWork","RemainingWork","Cost","ActualCost","BaselineCost");
 result.Assignments.Add(row);
 }
 }
 return result;
 }
}
}