namespace WuzeiIpc;

using System.Text.Json;
using System.Text.Json.Nodes;

public class Pipe {

  public static async Task<string> Send(string addr, string val){
    try{ 
      using var pipe  = new System.IO.Pipes.NamedPipeClientStream(".", addr, System.IO.Pipes.PipeDirection.InOut, System.IO.Pipes.PipeOptions.Asynchronous);
      await pipe.ConnectAsync();      
      using var sr = new StreamReader(pipe);
      using var sw = new StreamWriter(pipe);
      await sw.WriteLineAsync(val);
      await sw.FlushAsync();
      string response = await sr.ReadLineAsync()!;
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
}