// #r "nuget: Microsoft.CodeAnalysis.CSharp.Scripting, 4.9.2"
#r ".\Microsoft.CodeAnalysis.CSharp.Scripting.dll"

using System.Text.Json;
using System.Text.Json.Nodes;

using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;

try{

  // var res1 = await Pipe.Get("wuzeiNamedPipe");
  // Console.WriteLine(res1);

  // var res2 = await Pipe.Send("wuzeiNamedPipe", $$"""{ "type" : "alert", "payload": ["hogehoge"] }""");
  // var res2 = await Pipe.Send("wuzeiNamedPipe", $$"""{ "type" : "resize", "payload": [320,240] }""");
  // Console.WriteLine(res2);

    CSharpScript.RunAsync("System.Console.WriteLine(\"Hello Roslyn For Scripting!!\");").Wait();
    // Task<double> result = CSharpScript.EvaluateAsync<double>(@"
    //     var pi = 3.14;
    //     var r = 5;
    //     pi * r * r
    //     ");
    // result.Wait();
    // Console.WriteLine(result.Result);
  

} catch(Exception e) {
  Console.WriteLine(e);
} finally {

}
public class Pipe {

  public static async Task<string> Send(string addr, string val){
    try{ 
      using var pipe  = new System.IO.Pipes.NamedPipeClientStream(".", addr, System.IO.Pipes.PipeDirection.InOut, System.IO.Pipes.PipeOptions.Asynchronous);
      await pipe.ConnectAsync();      
      using var sr = new StreamReader(pipe);
      using var sw = new StreamWriter(pipe);
      await sw.WriteLineAsync(val);
      await sw.FlushAsync();
      string response = await sr.ReadLineAsync();
      return response;
    } catch ( IOException ofex ) { Console.WriteLine($"DisConnect {ofex.ToString()}");
    } catch ( Exception e ) { Console.WriteLine(e.ToString()); }
    return $$"""{ "status" : "error" }""";
  }

  public static async Task<JsonNode> Get(string addr){
    var res = await Pipe.Send(addr, $$"""{ "type" : "none", "payload": [] }""");
    JsonNode node = JsonNode.Parse(res)!;
    return node;
  }

}

public class MemoryMapReader {

  public static void Accessor(string addr, Action<System.IO.MemoryMappedFiles.MemoryMappedViewAccessor> act){
    try{
      using var mmf = System.IO.MemoryMappedFiles.MemoryMappedFile.OpenExisting(addr);
      using var accessor = mmf.CreateViewAccessor();
      act(accessor);
    } catch ( Exception e ) { Console.WriteLine(e.ToString()); }
  }

  public static void StreamAccessor(string addr, Action<System.IO.MemoryMappedFiles.MemoryMappedViewStream> act){
    try{
      using var mmf = System.IO.MemoryMappedFiles.MemoryMappedFile.OpenExisting(addr);
      using var stream  = mmf.CreateViewStream();
      act(stream);
    } catch ( Exception e ) { Console.WriteLine(e.ToString()); }
  }
  
  public MemoryMapReader(string pipepath, string mappath){
    var json = Pipe.Get(pipepath);
  }

}

public class IpcPixel {

  public string addr;

  private IpcPixel() { }

  public static IpcPixel Create(string addr, int width, int height) {
    var dst = new IpcPixel();
    dst.addr = addr;
    return dst;
  }

  // public IpcPixel Open(string addr) {}

}