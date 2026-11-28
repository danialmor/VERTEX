using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using MSP=Microsoft.Office.Interop.MSProject;
namespace UniversalMspOptimizer {
internal static class ScheduleOptimizer {
 static string F(object x) { return Convert.ToString(x,System.Globalization.CultureInfo.InvariantCulture); }
 static string Signature(MSP.Task t) {
 return string.Join("|",new[]{F(t.ActualStart),F(t.ActualFinish),F(t.ActualDuration),F(t.ActualWork),F(t.PercentComplete),F(t.Predecessors),F(t.Successors),F(t.BaselineStart),F(t.BaselineFinish),F(t.BaselineDuration),F(t.BaselineWork),F(t.ConstraintType),F(t.ConstraintDate),F(t.Milestone)});
 }
 static DateTime Finish(MSP.Task t) { return Convert.ToDateTime(t.Finish); }
 public static string Run(MSP.Application app,WbsLock profile,bool apply) {
 var p=app.ActiveProject;
 if(!string.Equals(p.FullName,profile.ProjectPath,StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Project mismatch");
 var tasks=new List<MSP.Task>(); foreach(MSP.Task t in p.Tasks) if(t!=null) tasks.Add(t);
 var summary=tasks.Single(t=>t.UniqueID==profile.SummaryUniqueId && t.Summary);
 var initial=Finish(summary); var target=profile.TargetFinish;
 if(Math.Abs((initial-target).TotalMinutes)<1) return "Target already met.";
 var snap=SnapshotReader.Read(p);
 var eligible=new HashSet<int>(snap.Tasks.Where(t=>t.Eligible).Select(t=>t.UniqueId));
 var candidates=new List<MSP.Task>(); bool inside=false;
 foreach(var t in tasks) {
 if(t.UniqueID==summary.UniqueID){inside=true;continue;}
 if(!inside)continue;
 if(t.OutlineLevel<=summary.OutlineLevel)break;
 if(t.Summary)continue;
 // First supported scope: automatic, unassigned, nonexternal, unconstrained leaf tasks.
 dynamic d=t;
 if(eligible.Contains(t.UniqueID) && !d.Manual && !d.ExternalTask && t.Assignments.Count==0 && (int)t.ConstraintType==0 && Convert.ToInt32(t.RemainingDuration)>=60) candidates.Add(t);
 }
 if(candidates.Count==0) return "No supported candidates.";
 var originals=candidates.ToDictionary(t=>t.UniqueID,t=>Convert.ToInt32(t.RemainingDuration));
 var signatures=tasks.ToDictionary(t=>t.UniqueID,Signature);
 var protectedDates=tasks.Where(t=>!t.Summary&&!originals.ContainsKey(t.UniqueID)).ToDictionary(t=>t.UniqueID,t=>F(t.Start)+"|"+F(t.Finish)+"|"+F(t.RemainingDuration));
 string dir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"VERTEX","MSPOptimizer","recovery"); Directory.CreateDirectory(dir);
 string backup=Path.Combine(dir,Guid.NewGuid().ToString("N")+".mpp");
 // Disk backup is only the last saved version; never claim it contains unsaved edits.
 File.Copy(p.FullName,backup);
 string audit=Path.Combine(dir,"audit.log");
 File.AppendAllText(audit,DateTime.Now.ToString("o")+" BEGIN "+backup+Environment.NewLine);
 bool committed=false; int best=0; double error=Math.Abs((initial-target).TotalMinutes);
 Action restore=()=>{foreach(var t in candidates)t.RemainingDuration=originals[t.UniqueID];app.CalculateProject();};
 Action validate=()=>{foreach(var t in tasks){if(Signature(t)!=signatures[t.UniqueID])throw new InvalidOperationException("Protected field changed: "+t.UniqueID); if(protectedDates.ContainsKey(t.UniqueID)&&protectedDates[t.UniqueID]!=F(t.Start)+"|"+F(t.Finish)+"|"+F(t.RemainingDuration))throw new InvalidOperationException("Protected schedule changed: "+t.UniqueID);}};
 try {
 int direction=initial>target?-1:1;
 int lo=1,hi=direction<0?originals.Values.Max()-60:Math.Min(48000,int.MaxValue-originals.Values.Max());
 for(int i=0;i<20 && lo<=hi;i++){
 int mid=lo+(hi-lo)/2; int delta=direction*mid;
 foreach(var t in candidates)t.RemainingDuration=Math.Max(60,checked(originals[t.UniqueID]+delta));
 app.CalculateProject(); validate();
 double diff=(Finish(summary)-target).TotalMinutes;
 if(Math.Abs(diff)<error){error=Math.Abs(diff);best=delta;}
 if(Math.Abs(diff)<1)break;
 if(diff*direction<0)lo=mid+1;else hi=mid-1;
 }
 restore();validate();
 if(error>=1)return "No exact target found in bounded search; no changes retained.";
 if(!apply)return "Preview: "+best+" minutes per eligible task (minimum 60); "+candidates.Count+" candidates. Trial restored.";
 foreach(var t in candidates)t.RemainingDuration=Math.Max(60,checked(originals[t.UniqueID]+best));
 app.CalculateProject();validate();
 if(Math.Abs((Finish(summary)-target).TotalMinutes)>=1)throw new InvalidOperationException("Final finish mismatch");
 File.AppendAllText(audit,DateTime.Now.ToString("o")+" APPLIED "+best+" "+backup+Environment.NewLine);
 committed=true;return "Target reached. Saved-version backup: "+backup;
 } finally {
 if(!committed){try{restore();validate();File.AppendAllText(audit,DateTime.Now.ToString("o")+" RESTORED "+backup+Environment.NewLine);}catch(Exception ex){throw new InvalidOperationException("Rollback verification failed. Stop editing; recovery copy: "+backup,ex);}}
 }
 }
}
}