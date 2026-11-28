using System;
using System.IO;
using System.Diagnostics;
using System.Threading;
using System.Windows.Forms;
using System.Security.Principal;
using UniversalMspOptimizer;
internal static class Program {
 static string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"VERTEX","MSPOptimizer");
 static string Recovery=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"VERTEX","MSPRecovery");
 static void SafeDir(string path){
 for(var d=new DirectoryInfo(path);d!=null;d=d.Parent)if(d.Exists&&(d.Attributes&FileAttributes.ReparsePoint)!=0)throw new IOException("Reparse point rejected");
 Directory.CreateDirectory(path);
 var acl=Directory.GetAccessControl(path);
 foreach(System.Security.AccessControl.FileSystemAccessRule rule in acl.GetAccessRules(true,true,typeof(SecurityIdentifier))){
 if(rule.AccessControlType!=System.Security.AccessControl.AccessControlType.Allow || (rule.PropagationFlags&System.Security.AccessControl.PropagationFlags.InheritOnly)!=0)continue;
 var sid=rule.IdentityReference.Value;
 var dangerous=System.Security.AccessControl.FileSystemRights.Write|System.Security.AccessControl.FileSystemRights.Delete|System.Security.AccessControl.FileSystemRights.ChangePermissions|System.Security.AccessControl.FileSystemRights.TakeOwnership|System.Security.AccessControl.FileSystemRights.DeleteSubdirectoriesAndFiles;
 if((rule.FileSystemRights&dangerous)!=0 && sid!="S-1-5-18" && sid!="S-1-5-32-544" && sid!="S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464")throw new IOException("Unsafe directory permissions: "+path);
 }
 }
 static void WaitClosed(){while(Process.GetProcessesByName("WINPROJ").Length!=0){if(MessageBox.Show("Save and close all Microsoft Project windows, then click Retry.","VERTEX MSP",MessageBoxButtons.RetryCancel)!=DialogResult.Retry)throw new OperationCanceledException();}}
 static int Install(string file){WaitClosed();using(var p=Process.Start(new ProcessStartInfo(file,"/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /DIR=\""+Root+"\""){UseShellExecute=false,WorkingDirectory=Path.GetDirectoryName(file)})){p.WaitForExit();return p.ExitCode;}}
 [STAThread] static void Main(string[] args){
 try{
 if(!new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator))throw new InvalidOperationException("Administrator approval required");
 SafeDir(Path.GetDirectoryName(Root));SafeDir(Root);SafeDir(Recovery);
 string self=Path.GetFullPath(System.Reflection.Assembly.GetExecutingAssembly().Location);
 if(string.Equals(self,Path.Combine(Root,"VertexUpdater.exe"),StringComparison.OrdinalIgnoreCase)){
 string dir=Path.Combine(Recovery,Guid.NewGuid().ToString("N"));SafeDir(dir);string worker=Path.Combine(dir,"VertexUpdater.exe");File.Copy(self,worker,false);
 Process.Start(new ProcessStartInfo(worker){UseShellExecute=false,WorkingDirectory=dir});return;
 }
 if(!string.Equals(Path.GetDirectoryName(Path.GetDirectoryName(self)),Recovery,StringComparison.OrdinalIgnoreCase))throw new IOException("Invalid worker location");
 using(var mutex=new Mutex(false,@"Global\VERTEX-MSP-Update")){
 if(!mutex.WaitOne(0))throw new InvalidOperationException("Another update is running");
 try{
 WaitClosed();
 string current="msp-v"+UpdateChecker.Build;
 string tag=UpdateChecker.FindLatest();
 if(tag==null){MessageBox.Show("No newer release.");return;}
 string dir=Path.GetDirectoryName(self);
 string previous=Path.Combine(dir,"previous.exe"),next=Path.Combine(dir,"VERTEX-MSP-Setup.exe");
 // Fail closed if a signed recovery installer for the current build is unavailable.
 File.WriteAllBytes(previous,UpdateChecker.FetchPackage(current));
 File.WriteAllBytes(next,UpdateChecker.FetchPackage(tag));
 if(MessageBox.Show("Install "+tag+"? A verified recovery installer is ready.","VERTEX MSP",MessageBoxButtons.YesNo)!=DialogResult.Yes)return;
 int code=Install(next);
 if(code!=0){int rollback=Install(previous);MessageBox.Show("Update failed ("+code+"). Recovery installer exit code: "+rollback+". Verify Project before use.");}
 else MessageBox.Show("Installer completed. Reopen Project and verify the ribbon and connection.");
 }finally{mutex.ReleaseMutex();}
 }
 }catch(OperationCanceledException){}catch(Exception ex){MessageBox.Show(ex.Message,"VERTEX MSP update stopped");}
 }
}
