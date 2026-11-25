using System.Linq;
using System.Windows.Forms;
using System.Drawing;
namespace UniversalMspOptimizer {
public sealed class SnapshotForm : Form {
 readonly DataGridView grid=new DataGridView { Dock=DockStyle.Fill, ReadOnly=true, AllowUserToAddRows=false, AutoGenerateColumns=true, AutoSizeColumnsMode=DataGridViewAutoSizeColumnsMode.DisplayedCells };
 readonly Label status=new Label { Dock=DockStyle.Top, Height=44 };
 public SnapshotForm() { Text="VERTEX | MSP Optimizer — Read only"; Width=1100; Height=600; StartPosition=FormStartPosition.CenterScreen; Controls.Add(grid); Controls.Add(status); }
 public void LoadSnapshot(ProjectSnapshot p) {
 status.Text=p.Name+" | Tasks: "+p.Tasks.Count+" | Preliminary candidates: "+p.Tasks.Count(t=>t.Eligible)+" | No schedule edits";
 grid.DataSource=p.Tasks.Select(t=>new { t.UniqueId,t.Wbs,t.Name,t.OutlineLevel,t.Summary,t.Milestone,t.Start,t.Finish,t.PercentComplete,t.ActualStart,t.ActualFinish,t.RemainingMinutes,t.Predecessors,t.Eligible,t.ProtectionReason }).ToList();
 }
}
}