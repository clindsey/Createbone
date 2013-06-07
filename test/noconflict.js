$(function () {
  module("Createbone.noConflict");

  test("noConflict", 2, function () {
    var noconflictCreatebone = Createbone.noConflict();
    equal(window.Createbone, undefined, "Returned window.Createbone");
    window.Createbone = noconflictCreatebone;
    equal(window.Createbone, noconflictCreatebone, "Createbone is still pointing to the original Createbone");
  });
});
