<?php
namespace app\admin\controller;

class Member extends Init{
	public function __construct(){
		parent::__construct();
	}
	
	public function index(){
		return $this->fetch();
	}
}