using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Extensibility;
using Microsoft.Office.Core;
using MSP = Microsoft.Office.Interop.MSProject;
namespace UniversalMspOptimizer {
[ComVisible(true), Guid("8B5F014E-CC5D-4B43-981A-6B73E5B2B112"), ProgId("UniversalMspOptimizer.Connect"), ClassInterface(ClassInterfaceType.None)]
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
 public string GetCustomUI(string RibbonID) { return @"<customUI xmlns=""http://schemas.microsoft.com/office/2009/07/customui""><ribbon><tabs><tab id=""vertexOptimizer"" label=""MSP Optimizer""><group id=""snapshotGroup"" label=""Read-only tools""><button id=""inspectProject"" label=""Inspect project"" size=""large"" onAction=""InspectProject""/><button id=""startBridge"" label=""Share snapshot"" onAction=""StartBridge""/><button id=""stopBridge"" label=""Stop sharing"" onAction=""StopBridge""/></group></tab></tabs></ribbon></customUI>"; }
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