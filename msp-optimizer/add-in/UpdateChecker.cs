using System;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Diagnostics;
namespace UniversalMspOptimizer {
internal static class UpdateChecker {
 internal const string Build="0.6.0-dev.2";
 static int running;
 const string Api="https://api.github.com/repos/danialmor/VERTEX/releases/latest";
 const string Releases="https://github.com/danialmor/VERTEX/releases";
 internal static async void Check(bool interactive) {
 if(Interlocked.Exchange(ref running,1)!=0) return;
 try {
 using(var client=new WebClient()) {
 client.Headers[HttpRequestHeader.UserAgent]="VERTEX-MSP/"+Build;
 var json=await client.DownloadStringTaskAsync(new Uri(Api));
 var release=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(json);
 string tag=Convert.ToString(release["tag_name"]);
 const string prefix="msp-v";
 Version remote;
 if(!tag.StartsWith(prefix,StringComparison.Ordinal) || !Version.TryParse(tag.Substring(prefix.Length),out remote)) {
 if(interactive) MessageBox.Show("No compatible stable MSP release found."); return;
 }
 if(remote.CompareTo(new Version(0,6,0))>=0) {
 if(MessageBox.Show("Published MSP release "+tag+" found. Open official release page? Save and close Project before installing. Only install a verified signed package.","VERTEX MSP",MessageBoxButtons.YesNo)==DialogResult.Yes)
 Process.Start(new ProcessStartInfo(Releases){UseShellExecute=true});
 } else if(interactive) MessageBox.Show("No newer stable MSP release found.");
 }
 } catch(Exception ex) { if(interactive) MessageBox.Show("Update check unavailable: "+ex.Message); }
 finally { Interlocked.Exchange(ref running,0); }
 }
}
}