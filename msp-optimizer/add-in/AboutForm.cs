using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net;
using System.Windows.Forms;
using System.Web.Script.Serialization;
namespace UniversalMspOptimizer {
internal static class AboutForm {
 const string Feed="https://danialmor.github.io/VERTEX/msp-bi/plugin-about.json";
 internal static void Show(){
 using(var f=new Form{Text="About VERTEX MSP",Width=720,Height=560,StartPosition=FormStartPosition.CenterScreen,MinimizeBox=false}){
 var info=new TextBox{Multiline=true,ReadOnly=true,Dock=DockStyle.Fill,ScrollBars=ScrollBars.Vertical,Text="VERTEX MSP\r\nInstalled build: "+UpdateChecker.Build+"\r\nBrand: VERTEX\r\nDeveloper: danialmor\r\nMicrosoft Project integration for project controls and reporting.\r\nLoading shared release information..."};
 var links=new FlowLayoutPanel{Dock=DockStyle.Bottom,Height=75,AutoScroll=true};
 string[] names={"Website","Dashboard","Telegram @Danimor1991","Releases","Changelog"};
 string[] urls={"https://danialmor.github.io/VERTEX/","https://danialmor.github.io/VERTEX/msp-bi/","https://t.me/Danimor1991","https://github.com/danialmor/VERTEX/releases","https://github.com/danialmor/VERTEX/blob/feature/msp-optimizer/msp-optimizer/CHANGELOG.md"};
 for(int i=0;i<names.Length;i++){string url=urls[i];var b=new Button{Text=names[i],AutoSize=true};b.Click+=(s,e)=>{try{Process.Start(new ProcessStartInfo(url){UseShellExecute=true});}catch(Exception ex){MessageBox.Show(ex.Message);}};links.Controls.Add(b);}
 f.Controls.Add(info);f.Controls.Add(links);
 f.Shown+=async(s,e)=>{try{using(var client=new WebClient()){client.Headers[HttpRequestHeader.CacheControl]="no-cache";var json=await client.DownloadStringTaskAsync(new Uri(Feed));var d=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(json);if(f.IsDisposed)return;var text=new System.Text.StringBuilder("VERTEX MSP\r\nInstalled build: "+UpdateChecker.Build+"\r\n");foreach(string k in new[]{"brand","developer","description","sourceVersion","publishedVersion"})text.AppendLine(k+": "+(d[k]??"Not published"));foreach(var item in (System.Collections.ArrayList)d["history"]){var h=(Dictionary<string,object>)item;text.AppendLine("\r\n"+h["version"]+" | "+h["date"]+" | "+h["status"]);text.AppendLine(Convert.ToString(h["notes"]));}info.Text=text.ToString();}}catch{if(!f.IsDisposed)info.AppendText("\r\nShared release information unavailable. Use official links below.");}};
 f.ShowDialog();
 }
 }
}
}
