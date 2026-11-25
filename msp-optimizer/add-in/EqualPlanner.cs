using System;
using System.Collections.Generic;
using System.Linq;
namespace UniversalMspOptimizer {
public sealed class DurationCandidate {
 public int UniqueId {get;set;}
 public int RemainingMinutes {get;set;}
 public int MinimumMinutes {get;set;}
}
public sealed class DurationChange {
 public int UniqueId {get;set;}
 public int Before {get;set;}
 public int After {get;set;}
}
public static class EqualPlanner {
 // Equal absolute minute adjustment, capped by individual minimums.
 // This is a candidate generator, NOT a CPM calculation or permission to write.
 public static List<DurationChange> Build(IEnumerable<DurationCandidate> candidates,int signedMinutes) {
 if(candidates==null) throw new ArgumentNullException("candidates");
 var rows=candidates.ToList();
 if(rows.Any(x=>x==null || x.UniqueId<=0 || x.MinimumMinutes<1 || x.RemainingMinutes<x.MinimumMinutes) || rows.Select(x=>x.UniqueId).Distinct().Count()!=rows.Count) throw new ArgumentException("Invalid candidates");
 return rows.Select(x=>new DurationChange { UniqueId=x.UniqueId, Before=x.RemainingMinutes, After=checked((int)Math.Max(x.MinimumMinutes,x.RemainingMinutes+(long)signedMinutes)) }).ToList();
 }
}
}