using System.Text.Json;
using System.Text.Json.Nodes;
try{
  /* args -> json */
  var args = Environment.GetCommandLineArgs()[3];
  JsonNode node = JsonNode.Parse(Environment.GetCommandLineArgs()[3])!;
  Console.WriteLine(node);
  var left = (int)node!["left"]!;
  var top = (int)node!["top"]!;
  var width = (int)node!["width"]!;
  var height = (int)node!["height"]!;
  int full_width = 0;
  int full_height = 0;
  int dst = 0;
  int count = 0;

  /* args -> json */
  MemoryMapReader.Accessor("wuzeiMemoryMapped_header", (accessor)=>{
    Console.WriteLine($"Capacity : {accessor.Capacity}");
    var buf = new byte[accessor.Capacity];
    accessor.ReadArray(0, buf, 0, buf.Length);
    string text = System.Text.Encoding.ASCII.GetString(buf).Split('\0')[0];
    JsonNode headernode = JsonNode.Parse(text)!;
    full_width = (int)headernode!["width"]!;
    full_height = (int)headernode!["height"]!;
    Console.WriteLine($"header : {text} width {full_width} height {full_height}");
  });
  MemoryMapReader.Accessor("wuzeiMemoryMapped", (accessor)=>{
    var buf = new int[full_width * full_height];
    accessor.ReadArray(0, buf, 0, buf.Length);

    for(var y=top;y<top+height;y++){
      for(var x=left;x<left+width;x++){
        dst += buf[x + y * full_width];
        count++;
      }
    }
    Console.WriteLine($"{dst} / {count} = {dst/count}");
  });


  /* to GUI dialog */
  var res = await WritePipe("wuzeiNamedPipe", $$"""{ "type" : "alert", "payload": ["{{dst/count}}"] }""");
  Console.WriteLine(res);

} catch(Exception e) {
  Console.WriteLine(e);
} finally {

}

static async Task<string> WritePipe(string addr, string val){
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
  return "Err";
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

  public MemoryMapReader(){
    
  }
}