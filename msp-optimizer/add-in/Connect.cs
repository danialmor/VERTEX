using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Extensibility;
using Microsoft.Office.Core;
using MSP = Microsoft.Office.Interop.MSProject;
namespace UniversalMspOptimizer {
[ComVisible(true), Guid("8B5F014E-CC5D-4B43-981A-6B73E5B2B112"), ProgId("UniversalMspOptimizer.Connect"), ClassInterface(ClassInterfaceType.AutoDispatch)]
public class Connect : IDTExtensibility2, IRibbonExtensibility {
 private MSP.Application app;
 private bool busy;
 private LocalBridge bridge;
 private SnapshotForm panel;
 public void OnConnection(object Application, ext_ConnectMode ConnectMode, object AddInInst, ref Array custom) { app = (MSP.Application)Application; }
 public void OnDisconnection(ext_DisconnectMode RemoveMode, ref Array custom) { StopBridge(null); if(panel != null && !panel.IsDisposed) panel.Close(); panel=null; app=null; }
 public void OnAddInsUpdate(ref Array custom) {}
 public void OnStartupComplete(ref Array custom) {}
 public void OnBeginShutdown(ref Array custom) { StopBridge(null); if(panel != null && !panel.IsDisposed) panel.Close(); }
 public string GetCustomUI(string RibbonID) { return @"<customUI xmlns=""http://schemas.microsoft.com/office/2009/07/customui""><ribbon><tabs><tab id=""vertexOptimizer"" label=""VERTEX MSP""><group id=""snapshotGroup"" label=""Read-only tools""><button id=""inspectProject"" label=""Inspect project"" imageMso=""FileOpen"" screentip=""Read active project"" size=""large"" onAction=""InspectProject""/><button id=""startBridge"" label=""Share snapshot"" imageMso=""FileSaveAs"" size=""large"" onAction=""StartBridge""/><button id=""stopBridge"" label=""Stop sharing"" imageMso=""CancelRequest"" size=""large"" onAction=""StopBridge""/></group><group id=""lockGroup"" label=""WBS targets""><button id=""saveLock"" label=""Save WBS target"" imageMso=""FileSave"" size=""large"" onAction=""SaveLock""/><button id=""trialLock"" label=""Trial target"" imageMso=""CalculateNow"" size=""large"" onAction=""TrialLock""/></group></tab></tabs></ribbon></customUI>"; }
 public void StopBridge(IRibbonControl control) { if(bridge!=null) { bridge.Dispose(); bridge=null; } }
 public void StartBridge(IRibbonControl control) {
 if(busy || app==null) return;
 if(MessageBox.Show("Share a read-only snapshot of the active project with VERTEX on this computer?","MSP Optimizer",MessageBoxButtons.YesNo)!=DialogResult.Yes) return;
 busy=true;
 try { StopBridge(null); if(app.Projects.Count==0) throw new InvalidOperationException("Open a project first.");
 bridge=new LocalBridge(SnapshotReader.Read(app.ActiveProject));
 using(var dialog=new Form { Text="Local session token", Width=620, Height=150, StartPosition=FormStartPosition.CenterScreen }) {
 dialog.Controls.Add(new TextBox { Text=bridge.Token, ReadOnly=true, Dock=DockStyle.Top });
 dialog.Controls.Add(new Label { Text="Copy token into VERTEX. Stop sharing to revoke it.", Dock=DockStyle.Bottom }); dialog.ShowDialog();
 }
 } catch(Exception ex) { StopBridge(null); MessageBox.Show("Bridge failed: "+ex.Message); } finally { busy=false; }
 }
 public void SaveLock(IRibbonControl control) {
 if(busy || app==null) return; busy=true;
 try {
 if(app.Projects.Count==0) throw new InvalidOperationException("Open a saved MPP first.");
 var project=app.ActiveProject;
 string path=project.FullName;
 if(!System.IO.Path.IsPathRooted(path) || !System.IO.File.Exists(path)) throw new InvalidOperationException("Save the local MPP first.");
 var rows=SnapshotReader.Read(project).Tasks.FindAll(t=>t.Summary && t.UniqueId>0);
 using(var dialog=new Form { Text="Save WBS target (no schedule edits)", Width=650, Height=220, StartPosition=FormStartPosition.CenterScreen }) {
 var list=new ComboBox { Dock=DockStyle.Top, DropDownStyle=ComboBoxStyle.DropDownList };
 foreach(var row in rows) list.Items.Add(row.UniqueId+" | "+row.Wbs+" | "+row.Name);
 var date=new DateTimePicker { Dock=DockStyle.Top, Format=DateTimePickerFormat.Custom, CustomFormat="yyyy-MM-dd HH:mm", Value=DateTime.Today.AddHours(17) };
 var save=new Button { Dock=DockStyle.Bottom, Text="Save target", DialogResult=DialogResult.OK };
 dialog.Controls.Add(date); dialog.Controls.Add(list); dialog.Controls.Add(save); dialog.AcceptButton=save;
 if(rows.Count==0) throw new InvalidOperationException("No summary tasks.");
 list.SelectedIndex=0;
 if(dialog.ShowDialog()==DialogResult.OK) {
 new LockProfiles().Save(new WbsLock { ProjectPath=path, SummaryUniqueId=rows[list.SelectedIndex].UniqueId, TargetFinish=date.Value, Enabled=false });
 MessageBox.Show("Target saved locally. Automatic enforcement is not yet available.");
 }
 }
 } catch(Exception ex) { MessageBox.Show("Target save failed: "+ex.Message); } finally { busy=false; }
 }
 public void TrialLock(IRibbonControl control) {
 if(busy || app==null) return; busy=true;
 try {
 if(app.Projects.Count==0) throw new InvalidOperationException("Open a disposable saved MPP copy.");
 var p=app.ActiveProject;
 var profiles=new LockProfiles().Read().FindAll(x=>string.Equals(x.ProjectPath,p.FullName,StringComparison.OrdinalIgnoreCase));
 if(profiles.Count==0) throw new InvalidOperationException("Save a WBS target first.");
 using(var dialog=new Form { Text="Experimental trial — disposable MPP only", Width=650, Height=180 }) {
 var list=new ComboBox { Dock=DockStyle.Top, DropDownStyle=ComboBoxStyle.DropDownList };
 foreach(var item in profiles) list.Items.Add(item.SummaryUniqueId+" | "+item.TargetFinish.ToString("yyyy-MM-dd HH:mm"));
 list.SelectedIndex=0;
 var run=new Button { Dock=DockStyle.Bottom, Text="Run trial and restore", DialogResult=DialogResult.OK };
 dialog.Controls.Add(list);dialog.Controls.Add(run);
 if(dialog.ShowDialog()!=DialogResult.OK)return;
 if(MessageBox.Show("Trial changes the open schedule temporarily. Confirm this is a disposable saved copy with no unsaved work.","Experimental trial",MessageBoxButtons.YesNo,MessageBoxIcon.Warning)!=DialogResult.Yes)return;
 StopBridge(null);
 MessageBox.Show(ScheduleOptimizer.Run(app,profiles[list.SelectedIndex],false));
 }
 } catch(Exception ex){MessageBox.Show(ex.Message);} finally {busy=false;}
 }
 public void InspectProject(IRibbonControl control) {
 if(busy || app==null) return;
 busy=true;
 try { if(app.Projects.Count==0) { MessageBox.Show("Open a project first."); return; }
 var snapshot=SnapshotReader.Read(app.ActiveProject);
 if(panel==null || panel.IsDisposed) panel=new SnapshotForm();
 panel.LoadSnapshot(snapshot); if(!panel.Visible) panel.Show(); panel.Activate();
 } catch(Exception ex) { MessageBox.Show("Read failed: "+ex.Message); } finally { busy=false; }
 }
}
}