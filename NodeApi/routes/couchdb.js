var express    = require('express');
var router     = express.Router();
var bodyParser = require('body-parser');
var connection = require('./db');
var async      = require('async');
var nano   = require('nano')('https://couchdb-8d8a45.smileupps.com')
, username = 'admin'
	  , userpass = '8c18747889e9'
	  , callback = console.log // this would normally be some callback
	  , cookies  = {} // store cookies, normally redis or something
	  ;

router.get('/exportProduk',function(req,res) {
	var ipay = nano.db.use('ipay_produk');
	var produks;
	async.series([
		function(callback){
			connection.query("SELECT * FROM master_produk",function(err,rows){
				if(err){
					console.log(err);
					res.json({"exported":false,"message":err});
				}else{
					if(rows.length==0){
						console.log("nodata");
						res.json({"exported":false,"message":"no data"});
					}else{
						produks = rows;
						callback();
					}
				}
			});
		}
		],function(err){
			if(err) console.log(err);
			var bod = [];
			async.each(produks,function(produk,callback){
				var id_produk = produk.id;
				var nama = produk.nama;
				var harga = produk.harga_beli;
				var nominal = produk.nominal;
				var result;
				var start = Date.now();
				var aktif = true;
				if(produk.aktif!=1) aktif = false;
				var kosong = false;
				if(produk.kosong!=0) kosong = true;
				var sql = "SELECT member_id,harga_jual,harga_beli FROM produk_member WHERE product_id ='"+id_produk+"' ; SELECT prioritas,id_supplier FROM supplier_produk WHERE id_produk ='"+id_produk+"' ORDER BY prioritas ASC";

				connection.query(sql,function(err,rows){
					if(err){
						console.log(err);

					}else{
						if(rows[0].length==0){
						console.log("nodata");
						}else{
							var memberList = rows[0];
							var supplierList = rows[1];
							var harga_beli ={};
							var harga_jual={};
							var supplier={};
							var memlen = memberList.length;
							var suplen = supplierList.length;
							supplier["count"]=suplen;
							var i;
							for(i = 0;i<memlen;i++){
								var member_id = memberList[i].member_id;
								var hb = memberList[i].harga_beli;
								var hj = memberList[i].harga_jual;
								harga_jual[member_id] = hb;
								harga_beli[member_id] = hj;
							}
							for(i=0;i<suplen;i++){
								var supplier_id = supplierList[i].id_supplier;
								var prioritas = supplierList[i].prioritas;
								supplier[prioritas]=supplier_id;
							}
							var newRow = '{id:'+id_produk+',nama:"'+nama+'",harga:'+harga+',nominal:'+nominal+',aktif:'+aktif+',kosong:'+kosong+',harga_beli:{'+harga_beli+'},harga_jual:{'+harga_jual+'}}';
							
							var row = {nama:nama,harga:harga,nominal:nominal,aktif:aktif,kosong:kosong,harga_beli:harga_beli,harga_jual:harga_jual,supplier:supplier};
							console.log(newRow);
							result = newRow;
							//curl -X POST http://127.0.0.1:5984/ipay2/ -d newRow -H "Content-Type: application/json";

							ipay.insert(row,id_produk,function(err,body){
								if(err){
									console.log(err);
									res.json({"exported":false,"message":"no data"});
								} 
								console.log
								bod.push(body);
								callback();
							});

						}
					}
				});
			},function(err){
				if(err) console.log(err);
				res.json({"exported":true,"body":bod});
			});
		});

});
router.get('/exportSupplier',function(req,res){
	var supplier = {};
	var ipay_sup = nano.db.use('ipay_supplier');
	var bod = [];
	var sql = "SELECT DISTINCT id_produk FROM supplier_produk";
	connection.query(sql,function(err,rows){
		if(err){
			console.log(err);
			res.json({"exported":false,"message":err});
		}else{
			if(rows.length==0){
				console.log('no produk data');
				res.json({"exported":false,"message":"tidak ada data produk"});
			}else{
				async.each(rows,function(row,callback){
					var id_produk = row.id_produk;
					var this_supplier = {};
					var get_supplier = "SELECT id_supplier,harga_terkini,is_ready FROM supplier_produk WHERE id_produk = '"+id_produk+"'";
					connection.query(get_supplier,function(err,result){
						if(err){
							console.log(err);
							res.json({"exported":false,"message":err});
						}else{
							if(result.length==0){
								console.log('no produk data');
								res.json({"exported":false,"message":"tidak ada data produk"});
							}else{
								var i;
								for(i=0;i<result.length;i++){
									var supplier_prop = {};
									supplier_prop["id"]=result[i].id_supplier;
									supplier_prop["is_ready"]=result[i].is_ready;
									supplier_prop["harga_terkini"]=result[i].harga_terkini;
									supplier[result[i].id_supplier] = supplier_prop;
								}
								ipay_sup.insert({supplier:supplier},id_produk,function(err,body){
									if(err){
										console.log(err);
										res.json({"exported":false,"message":"no data"});
									} 
									console.log
									bod.push(body);
									callback();
								});
								
							}
						}
					});
				},
				function(err){
					if(err) console.log(err);
					res.json(bod);
				}
				);
			}
		}
	});
});
router.post('/getProduk',function(req,res){
	var id_produk = req.body.produk;
	var produk = nano.db.use('ipay_produk');
	produk.get(id_produk,function(err,hasil){
		res.json(hasil.harga_beli);
	});
});
module.exports = router;