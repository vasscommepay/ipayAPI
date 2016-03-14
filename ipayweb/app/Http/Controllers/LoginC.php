<?php
namespace App\Http\Controllers;
use Request;
use Session;
use App\IpAddress as IpAddress;

class LoginC extends Controller
{
    function logedin(Request $req){
                $ipAddress = new IpAddress();
                $ip = $ipAddress->ipAddress;

                $loginUrl = "login";
                $username = Request::input('username');
                $password = Request::input('password');

                $url = "http://11.0.0.48:5000/login";
                $params = array("username"=>$username,"password"=>$password);
                $parameter = json_encode($params);
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");                     
                curl_setopt($ch, CURLOPT_POSTFIELDS, $parameter);            
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
                curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                        'Content-Type: application/json')                   
                );                                                                                                                   
                $result = curl_exec($ch);
                curl_close($ch);
                $res = json_decode($result);
                if($res->isLogin){
                        $session = $res->session;
                        Session::put('username',$username);
                        Session::put('session',$session);
                        return redirect('/');
                }else{
                        return redirect('login')->with('status','failed');
                }
                
                

	}
}
