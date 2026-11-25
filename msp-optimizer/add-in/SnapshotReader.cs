using System;
using System.Collections.Generic;
using MSP = Microsoft.Office.Interop.MSProject;
namespace UniversalMspOptimizer {
public sealed class TaskSnapshot {
 public int UniqueId, OutlineLevel, PercentComplete;
 public string Name, Wbs, Start, Finish, ActualStart, ActualFinish, Predecessors, ProtectionReason;
 public double RemainingMinutes, ActualMinutes;
 public bool Summary, Milestone, Eligible;
}
public sealed class ProjectSnapshot {
 public string Name;
 public List<TaskSnapshot> Tasks=new List<TaskSnapshot>();
}
public static class SnapshotReader {
 static string Field(object v) { return Convert.ToString(v,System.Globalization.CultureInfo.InvariantCulture) ?? ""; }
 static bool HasActualDate(object v) { if(v is DateTime) return true; string s=Field(v).Trim(); return s!="" && !s.Equals("NA",StringComparison.OrdinalIgnoreCase) && !s.Equals("N/A",StringComparison.OrdinalIgnoreCase); }
 public static ProjectSnapshot Read(MSP.Project project) {
 var result=new ProjectSnapshot { Name=project.Name };
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
 result.Tasks.Add(row);
 }
 return result;
 }
}
}