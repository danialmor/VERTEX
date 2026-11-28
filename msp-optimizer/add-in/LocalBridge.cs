using System;
using System.Net;
using System.Text;
using System.Threading;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
namespace UniversalMspOptimizer {
internal sealed class LocalBridge : IDisposable {
 const string Origin="https://danialmor.github.io";
 readonly HttpListener listener=new HttpListener();
 readonly string token;
 volatile byte[] snapshot;
 public string Token { get { return token; } }
 public LocalBridge(ProjectSnapshot data) {
 token=DeviceToken.LoadOrCreate();
 Refresh(data);
 listener.Prefixes.Add("http://127.0.0.1:18765/");
 try { listener.Start(); ThreadPool.QueueUserWorkItem(_=>Run()); } catch { listener.Close(); throw; }
 }
 public void Refresh(ProjectSnapshot data) { snapshot=Encoding.UTF8.GetBytes(new JavaScriptSerializer { MaxJsonLength=64000000 }.Serialize(data)); }
 bool Authorized(string value) {
 if(value==null || value.Length!=token.Length) return false;
 int diff=0; for(int i=0;i<token.Length;i++) diff|=value[i]^token[i]; return diff==0;
 }
 void Run() {
 while(listener.IsListening) {
 HttpListenerContext c; try { c=listener.GetContext(); } catch { break; }
 try { Handle(c); } catch { try { c.Response.StatusCode=500; } catch {} } finally { try { c.Response.Close(); } catch {} }
 }
 }
 void Handle(HttpListenerContext c) {
 var q=c.Request; var r=c.Response;
 r.Headers["Cache-Control"]="no-store";
 if(q.UserHostName!="127.0.0.1:18765" || q.Headers["Origin"]!=Origin) { r.StatusCode=403; return; }
 r.Headers["Access-Control-Allow-Origin"]=Origin;
 r.Headers["Vary"]="Origin";
 if(q.Url.AbsolutePath!="/v1/snapshot") { r.StatusCode=404; return; }
 if(q.HttpMethod=="OPTIONS") {
 if(q.Headers["Access-Control-Request-Method"]!="GET") { r.StatusCode=405; return; }
 r.Headers["Access-Control-Allow-Methods"]="GET, OPTIONS";
 r.Headers["Access-Control-Allow-Headers"]="Authorization";
 if(q.Headers["Access-Control-Request-Private-Network"]=="true") r.Headers["Access-Control-Allow-Private-Network"]="true";
 r.StatusCode=204; return;
 }
 if(q.HttpMethod!="GET") { r.StatusCode=405; return; }
 if(!Authorized(q.Headers["Authorization"]!=null && q.Headers["Authorization"].StartsWith("Bearer ",StringComparison.Ordinal)?q.Headers["Authorization"].Substring(7):null)) { r.StatusCode=401; return; }
 r.ContentType="application/json; charset=utf-8"; var bytes=snapshot; r.ContentLength64=bytes.Length; r.OutputStream.Write(bytes,0,bytes.Length);
 }
 public void Dispose() { listener.Close(); }
}
}