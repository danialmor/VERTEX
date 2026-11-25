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
 private SnapshotForm panel;
 public void OnConnection(object Application, ext_ConnectMode ConnectMode, object AddInInst, ref Array custom) { app = (MSP.Application)Application; }
 public void OnDisconnection(ext_DisconnectMode RemoveMode, ref Array custom) { if(panel != null && !panel.IsDisposed) panel.Close(); panel=null; app=null; }
 public void OnAddInsUpdate(ref Array custom) {}
 public void OnStartupComplete(ref Array custom) {}
 public void OnBeginShutdown(ref Array custom) { if(panel != null && !panel.IsDisposed) panel.Close(); }
 public string GetCustomUI(string RibbonID) { return @"<customUI xmlns=""http://schemas.microsoft.com/office/2009/07/customui""><ribbon><tabs><tab id=""vertexOptimizer"" label=""MSP Optimizer""><group id=""snapshotGroup"" label=""Read-only tools""><button id=""inspectProject"" label=""Inspect project"" size=""large"" onAction=""InspectProject""/></group></tab></tabs></ribbon></customUI>"; }
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