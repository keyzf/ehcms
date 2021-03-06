/**
 * XMLHttpRequest-异步请求组件
 */
define(['jquery', 'layer', 'eh'], function($, dialog){
	var xhr = {
		/** 数据返回成功处理方式标识 */
		doneState:{
			'message': 1, //仅提示信息
			'messageRedirect': 2, //提示信息并跳转（有返回跳转地址的情况下）
			'messageRefresh': 3, //提示信息并刷新页面。
		},
		/** 用于关闭弹窗 */
		layerIndex:null, 

		/**
		 * 异步GET请求
		 *
		 * @param  {String}   url        请求URL
		 * @param  {Object}   [data]     请求的参数
		 * @param  {String}   [dataType] 请求返回的类型
		 * @param  {Mixed}    [done]     请求正确时执行的函数或提示信息
		 * @param  {Mixed}    [fail]     请求错误时执行的函数或提示信息
		 */
		get: function(url, data, dataType, done, fail){
			$.get(url, data, '', dataType || 'json').then(
				function(data, sign, xhrObj){
					executeDone(done, data, sign, xhrObj);
				},
				function(xhrObj, sign, statusText){
					executeFail(fail, xhrObj, sign);
				}
			);
		},
		/**
		 * 异步POST请求
		 *
		 * 参数同上
		 */
		post: function(url, data, dataType, done, fail){
			$.post(url, data || {}, $.noop, dataType || 'json').then(
				function(data, sign, xhrObj){
					executeDone(done, data, sign, xhrObj);
				},
				function(xhrObj, sign, statusText){
					executeFail(fail, xhrObj, sign);
				}
			);
		},
		/**
		 * 异步PUT请求（主要配合ThinkPHP的资源路由）
		 *
		 * 参数同上
		 */
		put: function(url, data, dataType, done, fail){
			var option = {
				url: url,
				type: 'put',
				dataType: dataType || 'json',
				data: data
			};

			$.ajax(option).then(
				function(data, sign, xhrObj){
					executeDone(done, data, sign, xhrObj);
				},
				function(xhrObj, sign, statusText){
					executeFail(fail, xhrObj, sign);
				}
			);
		},
		/**
		 * 异步DELETE请求（主要配合ThinkPHP的资源路由）
		 *
		 * 参数同上
		 */
		delete: function(url, data, dataType, done, fail){
			var option = {
				url: url,
				type: 'delete',
				dataType: dataType || 'json',
				data: data
			};

			$.ajax(option).then(
				function(data, sign, xhrObj){
					executeDone(done, data, sign, xhrObj);
				},
				function(xhrObj, sign, statusText){
					executeFail(fail, xhrObj, sign);
				}
			);
		},
		/**
		 * 异步跨域请求
		 *
		 * 相同参数同上
		 * @param {String} jsonp         请求参数的数组名称
		 * @param {String} jsonpCallback 请求返回时的函数名称
		 */
		jsonp: function(url, data, dataType, jsonp, jsonpCallback, done, fail){
			var option = {
				url: url,
				type: 'get',
				dataType: dataType || 'json',
				data: data,
				jsonp: jsonp,
				jsonpCallback: jsonpCallback
			};

			$.ajax(option).then(
				function(data, sign, xhrObj){
					executeDone(done, data, sign, xhrObj);
				},
				function(xhrObj, sign, statusText){
					executeFail(fail, xhrObj, sign);
				}
			);
		},

		/**
		 * post快捷方式 messageRedirect
		 */
		postMessageRedirect: function(url, data, layerIndex){
			layerIndex && setLayerClose(layerIndex);
			this.post(url, data, '', this.doneState.messageRedirect);
		},

		/**
		 * post快捷方式 messageRefresh
		 */
		postMessageRefresh: function(url, data, layerIndex){
			layerIndex && setLayerClose(layerIndex);
			this.post(url, data, '', this.doneState.messageRefresh);
		}
	};

	/**
	 * 执行成功回调（请求成功）
	 *
	 * @param  {Mixed}  done 回调函数或函数数组或字符串
	 * @param  {Object} data 执行结果
	 */
	function executeDone(done, data, sign, xhrObj){
		done = done || {};

		//先对服务端返回的状态码进行判断
		if (data.code == 1) {
			//如果使用者自定义了处理方案，则直接使用。
			if (typeof done.success == 'function') {
				done.success(data);
				return false;
			}else{
				var msg = (typeof done.success == 'string' && done.success) || data.msg || '服务器返回正确';
				var icon = 6;
			}
		}else {
			//如果使用者自定义了处理方案，则直接使用。
			if (typeof done.fail == 'function') {
				done.fail(data);
				return false;
			}else{
				var msg = ((typeof done.fail == 'string' && done.fail) || data.msg || '服务器返回错误') + (eh.debug == 1 ? '（' + data.code + '）' : '');
				var icon = 5;
			}
		}

		xhr.layerIndex != null && layerClose(xhr.layerIndex);

		//根据用户指定的处理方式，对结果进行处理。
		if ((typeof done == 'object' && $.isEmptyObject(done)) || done === xhr.doneState.message) {
			dialog.msg(msg, {icon: icon});
		}else if (done === xhr.doneState.messageRedirect){
			if (data.data.redirect_url) {
				var wait = data.data.redirect_wait || 3;
				dialog.msg(msg + '，' + wait + '秒后自动跳转<a id="eh-xhr-redirect-url" href="' + data.data.redirect_url + '">立即跳转</a>', {time: wait * 1000, icon: icon}, function(){
					location.href = data.data.redirect_url;
				});
			}else{
				dialog.msg(msg, {icon: icon});
			}
		}
	}

	/**
	 * 执行失败回调（请求失败，指无法与服务端进行通讯或服务端返回数据异常，并不代表数据处理的失败。）
	 *
	 * @param  {Mixed}  fail 回调函数或函数数组
	 * @param  {Object} data 执行结果
	 */
	function executeFail(fail, xhrObj, sign){
		//根据服务器返回的状态码，判断错误类型。
		var statusText;

		if (sign == 'parsererror') {
			statusText = '服务端返回数据格式与要求不符！';
		}else{
			switch (xhrObj.status){
				case 404:
					statusText = '服务端页面无法响应！';
					break;
				default:
					statusText = '服务端未知错误！'
			}
		}

		if (!fail) {
			dialog.msg(statusText || '请求失败', {icon: 5});
			return false;
		}else{
			typeof fail == 'function' ? fail(data) : dialog.msg(fail, {icon: 5});
		}
	}

	/**
	 * 设置是否需要关键弹窗
	 *
	 * @param {Number} index layer返回的编号
	 */
	function setLayerClose(index){
		xhr.layerIndex = index;
	}

	/**
	 * 关闭指定或者全部layer弹窗，并清除保存的编号。
	 *
	 * @param {Number} index layer返回的编号
	 */
	function layerClose(index){
		if (!index) {
			return false;
		}

		if (index == 'all') {
			layer.closeAll();
		}else{
			layer.close(index);
		}
	}

	eh.xhr = xhr;
});