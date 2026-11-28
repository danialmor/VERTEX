using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web.Script.Serialization;
namespace UniversalMspOptimizer {
public sealed class WbsLock {
 public string ProjectPath {get;set;}
 public int SummaryUniqueId {get;set;}
 public DateTime TargetFinish {get;set;}
 public bool Enabled {get;set;}
}
public sealed class LockProfiles {
 readonly string path;
 readonly JavaScriptSerializer json=new JavaScriptSerializer();
 public LockProfiles() { path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"VERTEX","MSPOptimizer","locks.json"); }
 public List<WbsLock> Read() { return File.Exists(path)?json.Deserialize<List<WbsLock>>(File.ReadAllText(path)):new List<WbsLock>(); }
 public void Save(WbsLock item) {
 if(item==null || string.IsNullOrWhiteSpace(item.ProjectPath) || !Path.IsPathRooted(item.ProjectPath) || item.SummaryUniqueId<=0 || item.TargetFinish==default(DateTime)) throw new ArgumentException("Invalid lock");
 var rows=Read(); rows.RemoveAll(x=>string.Equals(x.ProjectPath,item.ProjectPath,StringComparison.OrdinalIgnoreCase)&&x.SummaryUniqueId==item.SummaryUniqueId); rows.Add(item);
 Directory.CreateDirectory(Path.GetDirectoryName(path)); string tmp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
 try { File.WriteAllText(tmp,json.Serialize(rows)); if(File.Exists(path)) File.Replace(tmp,path,null); else File.Move(tmp,path); } finally { if(File.Exists(tmp)) File.Delete(tmp); }
 }
}
}