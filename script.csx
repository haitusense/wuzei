/******** nugetからのload ********/ 

// nugetよりload
#r "nuget: Haitusense.Sandbox, 0.0.3"

// DLLでload
// #r ".\bin\Release\net8.0\nuget_test.dll"

// csxでload
// # load ".\hoge.csx"

using nuget_test;

var a = new Class1();
a.test();

/******** argsの読み込み ********/ 

/******** namedpipe通信 ********/ 

/******** memorymapped通信 ********/ 

