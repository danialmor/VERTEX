using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Diagnostics;
using System.Security.Cryptography;
namespace UniversalMspOptimizer {
internal static class UpdateChecker {
 internal const string Build="1.7.1-rc.1";
 internal const bool AutoCheck=true, AutoDownload=true, KeepPreviousVersion=true;
 internal const string CheckInterval="startup";
 // Owner-provisioned V2 public verification key; private key stays offline.
 const string TrustedPublicKey="<RSAKeyValue><Modulus>uq/R0z+7Uaw9FeGuQCtdsoM8mA0WmEKz1I5+nYHe/jj6KGjm+wGsDVjz17xHADsp3msvK0bSB6wmlSuwdJxZBD1Y6wCcEcNkpuF5w1DGYZ1hhCQeODtZ5U5gHQXazOpK4VV0fHMhWrzprJyrABzqOolEvbimL/I4iDr9lCzBcdcVgaKSa24+ZHRLhIXngg5ssn/Fxxy+Xa7FVA9CDT4O21jnpZEYjqW9/UU/S6m3WJWmwQB4g0sYTWjxO4ocOGh7ZtWfJhhXeGM5Kma5ppfO4IAFuDQ63pWd3fhr+W+zd4Gc44i9q1Jqu5oRQJIvud7sSmjXBSuXOL8fYp2N0qOCQKB+97k5EXe0+dIXPXKsba0YML4A7ZMF3GrjffIXCwSbcbvIwKQpQTvfQ5FfqvglsBBR2X4l/Gh9QFq3mghshOMz6MSDvnog2eJKkXE5f5FtvPubnfulhetD2Qxhly5ns19pPQb8iD7HdYvHyckIFVfwDkMnPyHb2SNim+zZRdMF</Modulus><Exponent>AQAB</Exponent></RSAKeyValue>";
 const string Root="https://github.com/danialmor/VERTEX/releases/download/";
 static int running;
 internal static string Status="Not checked";
 static byte[] Get(string url,int max) {
 for(int redirects=0;redirects<6;redirects++){
 var u=new Uri(url); if(u.Scheme!="https" || !u.IsDefaultPort || u.UserInfo!="" || !(u.Host=="github.com" || u.Host=="api.github.com" || u.Host=="release-assets.githubusercontent.com" || u.Host=="objects.githubusercontent.com")) throw new InvalidOperationException("Untrusted download host");
 var q=(HttpWebRequest)WebRequest.Create(u); q.AllowAutoRedirect=false;q.Timeout=30000;q.ReadWriteTimeout=30000;q.UserAgent="VERTEX-MSP/"+Build;
 using(var r=(HttpWebResponse)q.GetResponse()){
 int code=(int)r.StatusCode;if(code>=300&&code<400){url=new Uri(u,r.Headers["Location"]).AbsoluteUri;continue;}
 if(code!=200||r.ContentLength>max)throw new IOException("Invalid download");
 using(var s=r.GetResponseStream())using(var m=new MemoryStream()){byte[] b=new byte[65536];int n;while((n=s.Read(b,0,b.Length))>0){if(m.Length+n>max)throw new IOException("Download too large");m.Write(b,0,n);}return m.ToArray();}
 }
 }throw new IOException("Too many redirects");
 }
 static string Hex(byte[] b){return BitConverter.ToString(b).Replace("-","").ToLowerInvariant();}
 static string Stage(){
 var js=new JavaScriptSerializer{MaxJsonLength=4000000};var releases=js.Deserialize<List<Dictionary<string,object>>>(System.Text.Encoding.UTF8.GetString(Get("https://api.github.com/repos/danialmor/VERTEX/releases?per_page=100",4000000)));
 Version current=Version.Parse(Build.Split('-')[0]),best=null;string tag=null;bool development=Build.Contains("-");
 foreach(var r in releases){string t=Convert.ToString(r["tag_name"]);Version v;if(Convert.ToBoolean(r["draft"])||Convert.ToBoolean(r["prerelease"])||!t.StartsWith("msp-v",StringComparison.Ordinal)||!Version.TryParse(t.Substring(5),out v)||v.Build<0||v.Revision>=0)continue;if((v>current||(development&&v==current))&&(best==null||v>best)){best=v;tag=t;}}
 if(tag==null){Status="No newer MSP release";return null;}
 if(string.IsNullOrEmpty(TrustedPublicKey))throw new InvalidOperationException("Release signing key not provisioned; automatic installation disabled.");
 string baseUrl=Root+tag+"/";byte[] manifest=Get(baseUrl+"msp-manifest.json",65536),signature=Get(baseUrl+"msp-manifest.sig",8192);
 using(var rsa=new RSACryptoServiceProvider()){rsa.PersistKeyInCsp=false;rsa.FromXmlString(TrustedPublicKey);if(!rsa.VerifyData(manifest,CryptoConfig.MapNameToOID("SHA256"),signature))throw new CryptographicException("Invalid release signature");}
 var m=js.Deserialize<Dictionary<string,object>>(System.Text.Encoding.UTF8.GetString(manifest));
 if(Convert.ToString(m["tag"])!=tag||Convert.ToString(m["asset"])!="VERTEX-MSP-Setup.exe")throw new IOException("Manifest mismatch");
 byte[] data=Get(baseUrl+"VERTEX-MSP-Setup.exe",200000000);
 using(var sha=SHA256.Create()){if(!string.Equals(Hex(sha.ComputeHash(data)),Convert.ToString(m["sha256"]),StringComparison.OrdinalIgnoreCase))throw new CryptographicException("Package hash mismatch");}
 // Stage only. Never launch an executable from a user-writable cache with elevation.
 string dir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"VERTEX","MSPOptimizer","updates",tag);Directory.CreateDirectory(dir);
 string file=Path.Combine(dir,"VERTEX-MSP-Setup.exe");File.WriteAllBytes(file+".partial",data);if(File.Exists(file))File.Replace(file+".partial",file,null);else File.Move(file+".partial",file);
 Status="Verified package staged: "+tag;return file;
 }
 internal static async void Check(bool interactive){
 if(!interactive&&(!AutoCheck||CheckInterval!="startup"))return;
 if(Interlocked.Exchange(ref running,1)!=0)return;
 try{Status="Checking";var file=await Task.Run(()=>Stage());if(file!=null){MessageBox.Show("Verified update downloaded. Save and close Project. Secure installer handoff is not enabled yet.","VERTEX MSP");}else if(interactive)MessageBox.Show(Status);}
 catch(Exception ex){Status="Update unavailable: "+ex.Message;if(interactive)MessageBox.Show(Status);}
 finally{Interlocked.Exchange(ref running,0);}
 }
}
}
