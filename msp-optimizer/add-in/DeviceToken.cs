using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
namespace UniversalMspOptimizer {
internal static class DeviceToken {
 static readonly string PathName=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"VERTEX","MSPOptimizer","device-token.dpapi");
 static readonly byte[] Entropy=System.Text.Encoding.UTF8.GetBytes("VERTEX MSP local bridge v1");
 static T Locked<T>(Func<T> action) {
 using(var m=new Mutex(false,@"Local\VERTEX-MSP-DeviceToken-"+System.Security.Principal.WindowsIdentity.GetCurrent().User.Value)){
 bool held=false;try{try{held=m.WaitOne(10000);}catch(AbandonedMutexException){held=true;}if(!held)throw new IOException("Token store busy");return action();}finally{if(held)m.ReleaseMutex();}
 }}
 internal static string LoadOrCreate(){return Locked(()=>{
 if(File.Exists(PathName)){var raw=ProtectedData.Unprotect(File.ReadAllBytes(PathName),Entropy,DataProtectionScope.CurrentUser);try{if(raw.Length!=32)throw new CryptographicException("Invalid token");return Convert.ToBase64String(raw);}finally{Array.Clear(raw,0,raw.Length);}}
 Directory.CreateDirectory(Path.GetDirectoryName(PathName));var key=new byte[32];string tmp=PathName+"."+Guid.NewGuid().ToString("N")+".tmp";
 try{using(var rng=RandomNumberGenerator.Create())rng.GetBytes(key);File.WriteAllBytes(tmp,ProtectedData.Protect(key,Entropy,DataProtectionScope.CurrentUser));File.Move(tmp,PathName);return Convert.ToBase64String(key);}finally{Array.Clear(key,0,key.Length);if(File.Exists(tmp))File.Delete(tmp);}
 });}
 internal static void Revoke(){Locked(()=>{File.Delete(PathName);return true;});}
}
}
