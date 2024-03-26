using System.Text.Json;
using System.Text.Json.Nodes;
try{
  var res = await WritePipe("wuzeiNamedPipe", $$"""{ "type" : "alert", "payload": ["aaa"] }""");
  // var res = await WritePipe("wuzeiNamedPipe", "a");
  Console.WriteLine(res);

} catch(Exception e) {
  Console.WriteLine(e);
} finally {

}

static async Task<string> WritePipe(string addr, string val){
  string temp = "Err";
  try{ 
    using var pipe  = new System.IO.Pipes.NamedPipeClientStream(".", addr, System.IO.Pipes.PipeDirection.InOut, System.IO.Pipes.PipeOptions.Asynchronous);
    await pipe.ConnectAsync();      
    using var sr = new StreamReader(pipe);
    using var sw = new StreamWriter(pipe);
    // System.Threading.Thread.Sleep(500);
    await sw.WriteLineAsync(val);
    await sw.FlushAsync();
    string response = await sr.ReadLineAsync();
    temp = response;
  } catch ( IOException ofex ) { Console.WriteLine($"DisConnect {ofex.ToString()}");
  } catch ( Exception e ) { Console.WriteLine(e.ToString()); }
  return temp;
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