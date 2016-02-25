require.config({
    baseUrl : "/",
    paths : {
        rete : "/Rete.min",
        underscore : '/libs/underscore-min'
    },
});

require(['rete'],function(Rete){
    console.log("Rete Example");
    var rn = new Rete();
    console.log(rn);


});
