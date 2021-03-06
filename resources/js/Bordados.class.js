// Package Bordados 0.5
// By Andrrr [andresin@gmail.com]

// ////////////////////////////////////////////////////
// Class Bordado                            		 //
// genera, carga, muestra, elimina y guarda bordados //
// ////////////////////////////////////////////////////

function Bordado(nombre_bordado, contenedor) {
    
    // Config
    this.type = 'nodejs'; // 'php'
    
	this.mode = 'css';
	
    switch ( this.type ) {
        case 'php':
            this.ajax_script    = 'php/bordado.php';
            this.load_action    = '?action=load&bordado=';
            this.save_action    = '?action=save';
            this.delete_action  = '?action=delete&id=';
            this.list_action    = '?action=list';
        break;
        case 'nodejs':
            this.ajax_script    = '/';
            this.load_action    = 'bordados/';
            this.save_action    = 'bordados/';
            this.delete_action  = 'bordados/';
            this.list_action    = 'bordados/';
        break;
            
    }

	// Container CSS class name
	this.contenedor = contenedor || 'caneva';
	this.bordado_html = '';
    this.btn_save = '#guardar-bordado';
    
	this.puntos = '';

	// Grid border visible?
	this.malla = true;

	// Paint mode on?
	this.pintar = true;

	// Show Bordado? (if false, will return the data only)
	this.mostrar = true;

	// Animate?
	this.animar = { speed: 0, gif: false };
	
	// Mouse and Key events registered? (to avoid duplicated)
	this.registrados = false;

	// Debug coords? (Will show the coordinates in the grid)
	this.debug_coords = false;

	// Named "data" because is the part that will go into the DB
	this.data = {
		id: '',
		bordado: nombre_bordado || 'Bordado ' + Math.floor(Math.random(0, 1000) * 1000),
		filas: 25,
		columnas: 50,
		punto_base: 'cruz',
		ancho_punto: 15,
		ancho_hilo: 3,
		color_hilo: '#000000',
		color_bg: '#FFFFFF',
		color_malla: '#CCCCCC',
		coords: [],
		creado_el: Date.now(),
	};
}

// Define prototypes
Bordado.prototype = {

	constructor: Bordado,

	// Cargar desde MongoDB ==> ver db.js, routes/index.js
	cargar: function(bordado_id, opciones) {

		opciones = opciones || {};
		this.mostrar = typeof opciones.mostrar == 'undefined' ? this.mostrar : opciones.mostrar;
		this.animar  = typeof opciones.animar  == 'undefined' ? this.animar	 : opciones.animar;

		var Bordado = this; // Necesario para usarlo dentro de ajax.success()
		Bordado.data.id = bordado_id || Bordado.data.id;

		console.info('[INFO] $.ajax: Cargando bordado: ' + Bordado.data.bordado);

		if (Bordado.data.id) {
			$.ajax({
				url: this.ajax_script + this.load_action + bordado_id,
				method: 'GET',
				dataType: 'JSON',
				success: function(db_data) {
					if (db_data.id || db_data._id) {
						db_data.id = db_data._id || db_data.id;
						var coords = typeof db_data.coords != 'object' ? JSON.parse(db_data.coords) : db_data.coords;
						Bordado.data = db_data;
						Bordado.data.coords = coords;
						if ( $('input[name=velocidad]').prop('disabled') === false ) {
							Bordado.animar.speed = $('input[name=velocidad]').val() || Bordado.animar.speed;
						}
						if ( $('input[name=velocidad-gif]').prop('disabled') === false ) {
							Bordado.animar.gif = $('input[name=velocidad-gif]').val() || Bordado.animar.gif;
						}

						Bordado.grilla(opciones);
						console.info('[OK] $.ajax: Bordado cargado.');
						return true;
					} else {
						console.info('[INFO] $.ajax: No existe el bordado.');
						return false;
					}
				},
				error: function() {
					//alert('Error al cargar el bordado: ' + Bordado.data.bordado);
					console.info('[ERROR] $.ajax: Error al cargar el bordado: ' + Bordado.data.bordado);
					return false;
				}
			});

		}

	},

	// Guardar
	guardar: function(bordado_nombre) {

		this.data.bordado = bordado_nombre || this.data.bordado;

		var Bordado = this; // Necesario para usarlo dentro de ajax.success()

		if (Bordado.data) {

			var btn_save = this.btn_save,
				btn_states = {
					'save': $(this.btn_save).data('save-text') 		|| 'Guardar',
					'saving': $(this.btn_save).data('saving-text') 	|| 'Guardando...',
					'saved': $(this.btn_save).data('saved-text') 	|| 'Guardado'
				};

			$(btn_save).html(btn_states.saving);
			
			Bordado._method = Bordado.data.id  ? 'PUT' : 'POST';
			
			$.ajax({
				url: this.ajax_script + this.save_action + (Bordado.data.id || ''),
				method: Bordado._method,
                beforeSend: function (xhr) {
                    if ( Bordado._method == 'PUT' )
                        xhr.setRequestHeader('X-HTTP-Method-Override', 'PUT');
                },
                cache: false,
				data: this.data,
				dataType: 'JSON',
				success: function(res) {
					switch (res.result) {
						case 'ok':
							$(btn_save).html(btn_states.saved);
							
							if ( $('body').find('[data-id=' + (Bordado.data.id || res._id) + ']').length === 0 ) {

                                if ( $('#lista-bordados-borrar ul').find('li').filter(':contains("No hay bordados guardados")') ) {
                                    $('#lista-bordados-borrar').html('');
								}
                                
								$('#lista-bordados-borrar').prepend(
									'<li class="list-group-item"><a data-id="' + res._id + '" ' +
										'data-toggle="tooltip" ' +
										'data-title="Abrir" ' +
										'href="#' + res._id+ '">' + res.bordado + '</a>' +
											'<span class="pull-right">' +
												'<a class="delete" href="#delete" ' +
												'data-delete-id="' + res._id + '" ' +
												'data-bordado="' + res.bordado + '" ' +
												'data-title="Eliminar"' +
												'class="delete-bordado"><i class="glyphicon glyphicon-remove"></i></a>' +
											'</span>' +
										'</li>');
										$('#lista-bordados-borrar').find('li a').on('click', function(e) {
											e.preventDefault();
				                            var id 		= $(this).data('id');
				                            console.log('Bordado.data.id: ' + id);

											if ( $(this).hasClass('delete') ){
												
				                                var delete_id = $(this).data('delete-id');
												var bordado   = $(this).data('bordado');
				                                
												// (!) Prompt to delete Bordado
												console.info( 'Se está por eliminar el bordado: "' + bordado + '" con ID "' + delete_id + '"' );
												BootstrapDialog.confirm({
													title: 'Eliminar Bordado: "' + bordado + '"',
													message: '¿Confirmar?',
													type: BootstrapDialog.TYPE_WARNING,
													closable: true,
													draggable: true,
													btnCancelLabel: 'Cancelar',
													btnOKLabel: 'Eliminar',
													btnOKClass: 'btn-danger',
													callback: function(resultado) {
														if (resultado) {
															Bordado.eliminar(delete_id);
														} else {
															console.info( 'Acción cancelada: No se eliminó el bordado: "' + bordado + '"' );
															return;
														}
													}
												});
											} else {
												console.info( 'Se va a cargar el bordado con _id: ' + Bordado.data.id );
												e.preventDefault();
				                                Bordado.data.id = id;
												Bordado.cargar(id);
											}
										});
							}
							
							break;
						case 'error':
							$(btn_save).html(btn_states.save);
							break;
						case 'warning':
							$(btn_save).html(btn_states.save);
							break;
					}
				},
				error: function() {
					$(btn_save).html(btn_states.save);
					alert('No se pudo guardar el bordado...');
					console.error('$.ajax: No se pudo guardar el bordado...');
				}
			});

		}

	},

	// Eliminar Bordado de la Base de Datos
	eliminar: function(id) {

		if ( typeof id == 'undefined' ) {
			console.info('No se pudo eliminar el bordado: se requiere un ID...');
			return false;
		}

		console.info('$.ajax: Eliminando el bordado...');

		$.ajax({
			url: this.ajax_script + this.delete_action + id,
			method: 'DELETE',
			dataType: 'JSON',
			success: function(res) {
				switch (res.result) {
					case 'ok':
						$('body').find('[data-delete-id=' + id + ']').parentsUntil('ul').delay(200).remove();
						console.info( '$.ajax: Se eliminó el bordado' );
						
						if ( $('body').find('[data-delete-id]').length === 0 ) {
							$('#lista-bordados-borrar').html('<li class="list-group-item">No hay bordados guardados</li>');
							$('button[name=cargar]').hide();

							console.info('[INFO] $.ajax: No hay bordados para listar.');
						}
						
						return true;
					case 'error':
						console.info('$.ajax: No se pudo eliminar el bordado...');
                        console.log(res);
						return false;
				}
			},
			error: function(error) {
				console.info('$.ajax: No se pudo eliminar el bordado...');
                
				return false;
			}

		});

	},

	// Listar Bordados
	listar: function() {

		console.info('[INFO] $.ajax: Cargando lista de bordados.');

		var Bordado = this;

		$.ajax({
			url: this.ajax_script + this.list_action,
			method: 'GET',
			dataType: 'JSON',
			success: function(db_data) {
				if (db_data.length > 0) {

					var lista_bordados = '';
					$.each(db_data, function(key, db_bordado) {

						lista_bordados += '<li><a data-id="' +  db_bordado._id + '" ' +
						'data-toggle="tooltip"' +
						'data-title="Abrir"' +
						' href="#' + db_bordado._id + '">' + db_bordado.bordado + '</a></li>';
					});

					// Attach list of Bordados for Deleting
					$('#lista-bordados-borrar')
						.html($(lista_bordados))
						.find('li')
						.addClass('list-group-item')
						.each(function(key,li){

							$(li)
								.append('<span class="pull-right">' +
									'<a class="delete" href="#delete" ' +
									'data-delete-id="' + $(this).find('a').data('id') + '" ' +
									'data-bordado="' + $(this).text() + '" ' +
									'data-title="Eliminar"' +
									'class="delete-bordado"><i class="glyphicon glyphicon-remove"></i></a>' +
								'</span>');
						});

						$('#lista-bordados-borrar').find('li a').on('click', function(e) {
							e.preventDefault();
                            var id 		= $(this).data('id');
                            console.log('Bordado.data.id: ' + id);

							if ( $(this).hasClass('delete') ){
								
                                var delete_id = $(this).data('delete-id');
								var bordado   = $(this).data('bordado');
                                
								// (!) Prompt to delete Bordado
								console.info( 'Se está por eliminar el bordado: "' + bordado + '" con ID "' + delete_id + '"' );
								BootstrapDialog.confirm({
									title: 'Eliminar Bordado: "' + bordado + '"',
									message: '¿Confirmar?',
									type: BootstrapDialog.TYPE_WARNING,
									closable: true,
									draggable: true,
									btnCancelLabel: 'Cancelar',
									btnOKLabel: 'Eliminar',
									btnOKClass: 'btn-danger',
									callback: function(resultado) {
										if (resultado) {
											Bordado.eliminar(delete_id);
										} else {
											console.info( 'Acción cancelada: No se eliminó el bordado: "' + bordado + '"' );
											return;
										}
									}
								});
							} else {
                                
								console.info( 'Se va a cargar el bordado con _id: ' + Bordado.data.id );
								e.preventDefault();
                                Bordado.data.id = id;
								Bordado.cargar(id);

							}
						});

					$('#lista-bordados-borrar li a').tooltip();

					$('input[name=animar]').on('click', function(){
						$('input[name=velocidad]').prop('disabled', !$('input[name=velocidad]').prop('disabled'));
						if ( $('input[name=velocidad]').prop('disabled') === true ) {
							Bordado.animar.speed = 0;
						}
					});
					
					$('input[name=gif]').on('click', function(){
						$('input[name=velocidad-gif]').prop('disabled', !$('input[name=velocidad-gif]').prop('disabled'));
						if ( $('input[name=velocidad-gif]').prop('disabled') === true ) {
							Bordado.animar.gif = false;
						}
					});
					
					$('input[name=toggle-malla]').on('click', function(){
						console.log($('input[name=toggle-malla]').prop('checked'));
						if ( $('input[name=toggle-malla]').prop('checked') === false ) {
							Bordado.malla = false;
						} else {
							Bordado.malla = true;
						}
					});

					console.info('[OK] $.ajax: Lista de bordados cargada.');
				} else {

					$('#lista-bordados-borrar').html('<li class="list-group-item">No hay bordados guardados</li>');
					$('button[name=cargar]').hide();

					console.info('[INFO] $.ajax: No hay bordados para listar.');
				}
			},
			error: function() {
				//alert('Error al cargar lista de bordados.');
				console.info('[ERROR] $.ajax: Error al cargar lista de bordados.');
				return false;
			}
		});

	},

	// Generar grilla HTML
	grilla: function(opciones) {

		this.data = opciones.data ? opciones.data : this.data;

		var filas 		= parseInt(this.data.filas),
			columnas 	= parseInt(this.data.columnas),
			ancho 		= parseInt(this.data.ancho_punto);

			this.width 	= ( columnas 	* ancho + 1 ); // se le agrega el ancho del borde (1px)
			this.height = ( filas 		* ancho + 1 );

		switch ( this.mode ) {
			case 'svg':
				// this.puntos = new PuntoSVG(this.data);
				this.puntos = new PuntoCSS('cruz');
			break;
			
			case 'css':
				// this.puntos = new PuntoSVG(this.data);
				this.puntos = new PuntoCSS('cruz');
			break;
		}

		console.info('Nuevo objecto PuntoSVG creado');

		var primera_linea = '';

		console.info('Generando bordado: ' + this.data.bordado);

		if (this.debug_coords) {
			console.info('[Modo depuración!]');
			console.log(this.data);
		}

		// Extraer coordenadas
		var data_coords 	= this.coordenadas(),
			data_colores 	= {};

		// Comenzar Canevá
		this.bordado_html = '<div class="' + this.contenedor + '" style="width: ' + this.width + 'px; height: ' + this.height + 'px; margin:auto;">';

		// Loop que genera una malla de i filas por j columnas
		var i = 0;
		for (var y = 0; y < this.data.filas; y++) {

			for (var x = 0; x < this.data.columnas; x++) {
				if (x === 0) {
					primera_linea = ' primera-linea';
				} else {
					primera_linea = '';
				}
				next_coord = x + ',' + y + '';

				this.bordado_html += '<div data-toogle="tooltip" data-title="' + x + ',' + y + '" class="celda' + primera_linea + '" style="width: ' + ancho + 'px; height: ' + ancho + 'px;"' +
					(!this.debug_coords ? '' : ' style="font-size:9px;line-height:20px;""') +
					' rel="' + x + ',' + y + '">' +
					(!this.debug_coords ? ' ' : x + ',' + y) +
					'</div>';
			}

		}
		this.bordado_html += '</div>';

		// Mostrar o sólo devolver?
		if ( this.mostrar ) {
			this.ventana();
		} else {
			return this.bordado_html;
		}

	},

	// Generar HTML y Modal
	ventana: function() {

		var Bordado = this;

		$bordado_html = $(Bordado.bordado_html);

		var select_cambiar_punto = '<ul class="dropdown-menu" name="cambiar_punto" id="punto">';

		$.each(Bordado.puntos.verPuntos(), function(punto, svg) {
			select_cambiar_punto += 
			'<li value="' + punto + '"' + '>' + 
				'<a href="#punto" data-punto="' + punto + '">' +
					punto.replace(/\_/g, ' ') +
				'</a>' +
			'</li>';
		});

		select_cambiar_punto += '</ul>';

		var punto_actual = Bordado.puntos.generarPunto( Bordado.data.punto_base );

		// Opciones (guardar, etc)
		$form = $('<form name="guardar" class="form-inline">' +
			( !Bordado.data.id ? '<input type="text" ' +
				'class="form-control" ' +
				'name="bordado" ' +
				'id="bordado" ' +
				'value="' + $('#bordado-nuevo').val() + '" ' +
				'placeholder="Nombre de tu bordado">' : '' ) +
			'<button ' +
				'id="guardar-bordado" ' +
				'class="btn btn-success" ' +
				'name="guardar" ' +
				'data-save-text="Guardar" ' +
				'data-saving-text="Guardando..." ' +
				'data-saved-text="Guardado!" ' +
				'autocomplete="off">Guardar' +
			'</button> ' +
			'<button id="limpiar" class="btn btn-danger">Limpiar</button>' +
			'</form>' +
			'<aside class="container opciones-ventana alert alert-info">' +
				'<div class="row">' +
					'<form name="opciones" class="form">' +
						'<div class="btn-group">' +
				  			'<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
					    		'Punto <span class="caret"></span>' +
							'</button>' +
							select_cambiar_punto +
						'</div>' +
						'<br>' +
						'<span id="punto-actual-texto">' + Bordado.data.punto_base + '</span>' +
						'<div class="text-center">' +
							'<div id="punto-actual" class="celda_muestra" data-punto-actual=""></div>' +
						'</div>' +
						'<hr>' +
						'<div class="form-group">' +
							'<label for="ancho_hilo">Grosor de hilo:</label>' +
							'<input class="form-control" type="number" name="cambiar_ancho_hilo" value="' + Bordado.data.ancho_hilo + '" min="1" max="20" step="1">' +
						'</div>' +
						'<!--div class="form-group">' +
							'<label for="ancho_punto">Ancho de punto:</label>' +
							'<input class="form-control" type="number" name="cambiar_ancho_punto" value="' + Bordado.data.ancho_punto + '" min="1" max="30" step="1">' +
						'</div-->' +
						'<div class="form-group">' +
							'<label for="color_hilo">Color de hilo:</label>' +
							'<input class="form-control" type="color" name="cambiar_color_hilo" value="' + Bordado.data.color_hilo + '">' +
						'</div>' +
						'<div class="form-group">' +
							'<label for="color_bg">Color de tela:</label>' +
							'<input class="form-control" type="color" name="cambiar_color_bg" value="' + Bordado.data.color_bg + '">' +
						'</div>' +
						'<label for="color_picker">Tomar color:</label>' +
						'<span class="input-group-addon">' +
							'<input name="color_picker" type="checkbox" aria-label="animar">' +
						'</span>' +
						//'<label for="color_malla">Color de malla:</label>' +
						//'<input class="form-control" type="color" name="cambiar_color_malla" value="' + Bordado.data.color_malla + '">' +
						'<br><div class="form-group">' +
							'<button class="btn btn-info" name="toggle-malla">Ocultar malla</button>' +
							'<hr>' +
							'<button class="btn btn-success" name="save-frame" data-toggle="tooltip" data-title="Sólo local"><small>Generar PNG</small></button>' + 
							'<div class="save-frame-message"></div>' +
						'</div>' +
					'</form>' +
				'</div>' +
			'</aside>');

		// Esconder bordado
		$bordado_html.hide();

		// Determinar tamaño BootstrapDialog.SIZE_* es malísimo!
		var dialog_size = ( Bordado.data.columnas >= 50 ? '60vw' : ( Bordado.data.columnas >= 30 ? '50vw' : '35vw' ) );

		BootstrapDialog.show({
			size: BootstrapDialog.SIZE_LARGE,
			title: Bordado.data.bordado + ' ~ ' + Bordado.data.filas + 'x' + Bordado.data.columnas,
			message: $bordado_html,
			closable: true,
			closeByBackdrop: false,
			closeByKeyboard: false,

			onshow: function(dialogRef) {

				dialogRef.getModalFooter()
				.append($form)
				.css({
					display: 'inline'
				});

			},
			onshown: function(dialogRef) {

				$('.modal-dialog .modal-content').css({
					width: (Bordado.width + 50) + 'px'
				});

				if ( Bordado.malla === false ) {
					$('.celda').removeClass('clicked').css({
						borderLeft: 'transparent',
						borderBottom: 'transparent'
					});
				} else {
					$('.celda').removeClass('clicked').css({
						borderLeft: '1px solid ' + Bordado.data.color_malla,
						borderBottom: '1px solid ' + Bordado.data.color_malla
					});
				}
                
				$('.caneva').css({
					borderRight: '1px solid ' + Bordado.data.color_malla,
					borderTop: '1px solid ' + Bordado.data.color_malla,
					background: Bordado.data.color_bg
				});

				$('.opciones-ventana').css({display:'block'});
				$('.modal-dialog').css({
					width: dialog_size
				});

				$bordado_html.show();

				if ( typeof Bordado.animar != 'undefined' && Bordado.animar.speed > 0 ) {

					$('.celda').html('');

					if ( Bordado.animar.gif ) {
						Bordado.animar.speed = 1000;
					}

					//Bordado.shuffle();
					var i = 0,
						n = '',
					    interval2 = setInterval(function() {
						Bordado.puntos.colorHilo(Bordado.data.coords[i].color_hilo);
						Bordado.puntos.anchoHilo(Bordado.data.coords[i].ancho_hilo);

						var rel = Bordado.data.coords[i].coord.x + ',' + Bordado.data.coords[i].coord.y;
						$('.celda[rel="' + rel + '"]').html(Bordado.puntos.generarPunto(Bordado.data.coords[i].punto));
						
						if ( Bordado.animar.gif ) {
							if ( i < 10 ) {
								n = '-000' + i;
							} else if ( i < 100 ) {
								n = '-00' + i;
							} else if ( i < 1000 ) {
								n = '-0' + i;
							}
							Bordado.render(Bordado.data.bordado + n, false);
						}
						i++;
						
						if ( i == Bordado.data.coords.length ) {
							clearInterval(interval2);
                            
                            setTimeout(function(){
                                $.ajax({
                                    url: '/bordados/renders/animation',
                                    method: 'post',
                                    data: {bordado: Bordado.data.bordado },
                                    dataType: 'json',
                                    success: function(result) {
                                        console.log('OK');
                                        console.log(result);
                                    },
                                    error: function(error) {
                                        console.log('Error');
                                        console.log(error);
                                    }
                                });
                            }, 5000); // Wait 5 seconds so last image is saved (improve this please!!!)
                            
						}

					}, Bordado.animar.speed);

				} else {

					for ( var p = 0; p < Bordado.data.coords.length; p++ ) {
						Bordado.puntos.colorHilo(Bordado.data.coords[p].color_hilo);
						Bordado.puntos.anchoHilo(Bordado.data.coords[p].ancho_hilo);
						Bordado.puntos.tipoPunto(Bordado.data.coords[p].punto);

						var rel = Bordado.data.coords[p].coord.x + ',' + Bordado.data.coords[p].coord.y;
						$('.celda[rel="' + rel + '"]')
							.html(Bordado.puntos.generarPunto(Bordado.data.coords[p].punto));
					}

				}

                $('.caneva').after(
                    '<button class="btn-xs add-row"><i class="glyphicon glyphicon-plus"></i> </button>'
                );

				// Registrar eventos
				Bordado.eventos();
				console.info('[INFO] Eventos registrados.');

			},
			onhide: function(dialogRef) {
				$('.celda').removeClass('clicked');
				if ( typeof $interval2 != 'undefined' )
					clearInterval($interval2);
			},
			onhidden: function(dialogRef){
				console.info('Se cerró el Canevá.');
			}
		});

	},

	// Registrar Eventos
	eventos: function() {

		// Los eventos aún no fueron registrados?
		if (!this.registrados) {

			var Bordado = this;

			$color_hilo 	= $('[name=cambiar_color_hilo]');
			$ancho_hilo 	= $('[name=cambiar_ancho_hilo]');
			$punto_actual 	= $('#punto-actual');
			
			$('[data-toggle="tooltip"]').tooltip();

			// Botón Guardar
			$(this.btn_save).unbind('click').on('click', function(e) {
				e.preventDefault();
				Bordado.data.punto_base = $punto_actual.data('punto-actual');
				Bordado.guardar($('#bordado').val());
			});
			
			$('#punto-actual').html( Bordado.puntos.generarPunto( Bordado.data.punto_base) );

			/**
			 * Dibujar/pintar con el mouse!
			 */
			var can_drag = false;
			$('.celda, svg')
				.on('mousedown', function(e){
					e.preventDefault();
					can_drag = true;
					prev_rel = $(this).attr('rel');
				})
				.on('mousemove', function(e){
					e.preventDefault();

					if ( can_drag === true ) {

						// Coordenada
						var rel = $(this).attr('rel');

						if (e.which == 1) {

							$('.celda').removeClass('clicked');
							
							// Color...
							Bordado.puntos.colorHilo( $color_hilo.val() );

							// Ancho...
							Bordado.puntos.anchoHilo( $ancho_hilo.val() );

							// Coordenada
							var rel = $(this).attr('rel');
							
							// Punto actual
							var punto_actual = $('#punto-actual').text() || Bordado.data.punto_base;
							
							if ( $(this).html() === ' ' && punto_actual.match(/rasti_/) ) {
								if ( punto_actual == 'rasti_hor' ){
									punto_actual = 'rasti_vert';
								} else {
									punto_actual = 'rasti_hor';
								}
								Bordado.data.punto_base = punto_actual;
								var muestra_punto = Bordado.puntos.generarPunto( punto_actual );
								$('#punto-actual-texto').html(punto_actual);
								$('#punto-actual').data('punto-actual', punto_actual);
								$('#punto-actual').html(muestra_punto);
							}

							// Tipo de Punto (css)...
							var punto_css = Bordado.puntos.generarPunto(
								punto_actual
							);

							// (1) Agregar nuevo punto SVG a la Grilla
							$(this).html(punto_css).addClass('clicked');

							// (2) Agregar nuevo punto al Array de Puntos
							if ( rel ) {
								var xy = rel.split(',');
								Bordado.agregar({
									coord: {
										x: xy[0],
										y: xy[1]
									},
									punto: punto_actual,
									color_hilo: $color_hilo.val(),
									ancho_hilo: $ancho_hilo.val()
								});
							}
						}

						if (e.which == 3) {
							// Quitar punto del Array de Puntos
							Bordado.quitar(rel);
						}
					}
				})
				.on('mouseup', function(e){
					e.preventDefault();
					can_drag = false;
				});

			/* Celdas */
			$('.celda').removeClass('clicked');

			$('.celda')
				.unbind('click')
				.on('click', function(e) {
					e.preventDefault();
					var self = $(this);

					// Picking color?
					if ( $('input[name=color_picker]').prop('checked') === true ) {

						// Reset color picker state
						$('input[name=color_picker]').prop('checked', false);

						// Take color from background
						if ( $(this).text() == ' ' ) {
							$('input[name=cambiar_color_hilo]').val( $('input[name=color_bg]').val() );
							return;
						}
						
						var hexcolor = '';

						// Take color from SVG
						$('input[name=cambiar_color_hilo]').val( function(){
							
							// Take color from CSS
							if ( self.css('background').match(/(rgb)\((.*)\)/g).length ) {
								var rgb = self.find('div').css('background')
									.match(/(rgb)\((.*)\)/g);
									rgb = rgb[0]
									.replace(/([a-z\(\)\,]*)/g,'')
									.split(' ')
									.forEach(function(color){
										if ( parseInt(color).toString(16).length == 1 ){
											hexcolor += '0' + parseInt(color).toString(16);
										} else {
											hexcolor += parseInt(color).toString(16);
										}
									});
									return '#' + hexcolor;;
							}
							
							if ( self.find('svg').length ) {
								self.find('svg').children()
									.prop('style').stroke
									.replace(/([a-z\(\)\,]*)/g,'')
									.split(' ')
									.forEach(function(color){
										if ( parseInt(color).toString(16).length == 1 ){
											hexcolor += '0' + parseInt(color).toString(16);
										} else {
											hexcolor += parseInt(color).toString(16);
										}
									});
									return '#' + hexcolor;
							}
						});
						return;
					}

					$('.celda').removeClass('clicked');

					// Color...
					Bordado.puntos.colorHilo( $color_hilo.val() );

					// Ancho...
					Bordado.puntos.anchoHilo( $ancho_hilo.val() );
					
					// Coordenada
					var rel = $(this).attr('rel');
					
					// Punto actual
					var punto_actual = $('#punto-actual').text() || Bordado.data.punto_base;
					
					if ( punto_actual.match(/rasti_/) ) {
						
						if ( punto_actual == 'rasti_hor' ){
							punto_actual = 'rasti_vert';
						} else {
							punto_actual = 'rasti_hor';
						}
						Bordado.data.punto_base = punto_actual;
						var muestra_punto = Bordado.puntos.generarPunto( punto_actual );
						$('#punto-actual-texto').html(punto_actual);
						$('#punto-actual').data('punto-actual', punto_actual);
						$('#punto-actual').html(muestra_punto);
					}
					
					// Tipo de Punto (css)...
					var punto_css = Bordado.puntos.generarPunto(
						punto_actual
					);
					// console.log($('#punto-actual').text() || Bordado.data.punto_base);
					console.log(punto_css);

					// (1) Agregar nuevo punto SVG a la Grilla
					$(this).html(punto_css).addClass('clicked');

					// (2) Agregar nuevo punto al Array de Puntos
					var xy = rel.split(',');
					Bordado.agregar({
						coord: {
							x: xy[0],
							y: xy[1]
						},
						punto: punto_actual,
						color_hilo: $color_hilo.val(),
						ancho_hilo: $ancho_hilo.val()
					});

				})
				.on('contextmenu', function(e) {
					e.preventDefault();
					var rel = $(this).attr('rel');
					if ($(this).html != ' ') {
						Bordado.quitar(rel);
					}
				});

			/* Botones de formulario */

			// Botón cambiar color de hilo
			$('#color_hilo').unbind('change').on('change', function(e) {
				e.preventDefault();
				Bordado.puntos.colorHilo($(this).val());
			});


			/* Pintar / Mover */
			$(document).unbind('keydown').bind('keydown', function(e) {

				switch (e.which) {
					case 37: // left
						Bordado.moverPunto('left');
						e.preventDefault(); // prevent the default action (scroll / move caret)
						break;

					case 75: // k, left down
						Bordado.moverPunto('left-down');
						break;

					case 38: // up
						Bordado.moverPunto('up');
						e.preventDefault(); // prevent the default action (scroll / move caret)
						break;

					case 73: // i, left up
						Bordado.moverPunto('left-up');
						break;

					case 39: // right
						Bordado.moverPunto('right');
						e.preventDefault(); // prevent the default action (scroll / move caret)
						break;

					case 79: // o, right up
						Bordado.moverPunto('right-up');
						break;

					case 40: // down
						Bordado.moverPunto('down');
						e.preventDefault(); // prevent the default action (scroll / move caret)
						break;

					case 76: // l, right down
						Bordado.moverPunto('right-down');
						break;

					default:
						return; // exit this handler for other keys
				}
			});

			// Toggle Mover/Pintar
			$('body').unbind('keypress').bind('keypress', function(e) {

				var code = (e.keyCode ? e.keyCode : e.which);

				if (code == 32) { // spacebar?
					e.preventDefault();
					//$('[name="modo"]').not(':checked').prop("checked", true);
					Bordado.pintar = !Bordado.pintar;
				}
			});


			// Modificar Canevá dentro del Dialog
			//
			// Tipo de Punto
			// $('[name=punto],[name=cambiar_punto]').on('change', function() {
			// 	Bordado.data.punto_base = $(this).val();
			// });
			
			$('#punto a').on('click', function(e) {
				e.preventDefault();
				
				Bordado.data.punto_base = $(this).data('punto');
				
				var muestra_punto = Bordado.puntos.generarPunto( Bordado.data.punto_base );
				$('#punto-actual-texto').html($(this).text());
				$('#punto-actual').data('punto-actual', $(this).data('punto'));
				$('#punto-actual').html(muestra_punto);
			});

			// Grosor de Hilo:
			$('[name=cambiar_ancho_hilo]')
				.on('change', function(e){
					e.preventDefault();
					Bordado.data.ancho_hilo = $(this).val();
					console.log('ancho_hilo (grosor): ' +$(this).val());
			});

			// Tamaño de Punto
			$('[name=cambiar_ancho_punto]')
				.on('change', function(e){
					e.preventDefault();
					Bordado.data.ancho_punto = $(this).val();
					// Bordado.puntos.svg.ancho_punto = $(this).val();
					console.log('ancho_punto (tamaño): ' + $(this).val());
			});

			// Color de Hilo
			$('[name=cambiar_color_hilo]')
				.on('change', function(e){
					e.preventDefault();
					Bordado.puntos.colorHilo( $(this).val() );
					Bordado.data.color_hilo = $(this).val();
					//Bordado.puntos.svg.color_hilo = $(this).val();
			});

			// Cambiar color de "tela" (background)
			$('[name=cambiar_color_bg]')
				.on('change', function(){

					Bordado.data.color_bg = $(this).val();
					$('.caneva').css({
						background: Bordado.data.color_bg
					});

			});

			// Color de Malla
			/*$('[name=cambiar_color_malla]')
				.unbind('keyup mouseup')
				.on('keyup mouseup', function(e){
					e.preventDefault();
					console.log($(this).val());
			});*/

			// Toggle ocultar/mostrar malla
			$('[name=toggle-malla]')
				.unbind('click')
				.on('click', function(e){
					e.preventDefault();

					if ( Bordado.malla ) {
						$('.celda, .caneva').css({
							'border-color': 'rgba(0,0,0,0)'
						});
						$(this).text('Mostrar malla');
						console.info('Malla oculta.');
					} else {
						$('.celda, .caneva').css({
							'border-color': Bordado.data.color_malla || '#ccc'
						});
						$(this).text('Ocultar malla');
						console.info('Malla visible.');
					}

					Bordado.malla = !Bordado.malla;
				});


			$('#limpiar').on('click', function(e) {
				e.preventDefault();

				$('.type-warning .modal-content').css({
					width: '200px'
				});

				BootstrapDialog.confirm({
					title: 'Limpiar Canevá',
					message: '¿Confirmar?',
					type: BootstrapDialog.TYPE_WARNING,
					closable: true,
					draggable: true,
					btnCancelLabel: 'Cancelar',
					btnOKLabel: 'Limpiar',
					btnOKClass: 'btn-warning',
					callback: function(resultado) {
						if (resultado) {
							$('.celda').html(' ');
							Bordado.data.coords = [];
						} else {
							return;
						}
					}
				});
			});
			
			$('button[name="save-frame"]').on('click', function(e){
				e.preventDefault();
				Bordado.render(Bordado.data.bordado + '-frame-' + Math.random(0,1000));
			});
            
            $('.add-row').unbind('click').bind('click', function() {
                Bordado.addRow();
            });
			
		} // fin de this.registrados
	}, // fin de eventos

	// Mover punto en la grilla
	moverPunto: function(punto_dir) {

		if ($('.clicked').length) {

			var punto = this.puntos.generarPunto($('#punto-actual').text() || this.data.punto_base),
				coord = $('.clicked').attr('rel').split(','),
				celda = '';

			$('.celda').removeClass('clicked');

			console.log('this.pintar: ' + this.pintar);

			switch (punto_dir) {
				case 'up':
					if (parseInt(coord[1]) > 0) {
						var coord_up = coord[0] + ',' + (parseInt(coord[1]) - 1);
						celda = $('.celda[rel="' + coord_up + '"]');

						if (this.pintar) {
							this.agregar({
								coord: {
									x: coord[0],
									y: (parseInt(coord[1]) - 1)
								},
								punto: $('#punto-actual').text() || Bordado.data.punto_base,
								color_hilo: $('[name=cambiar_color_hilo]').val() || Bordado.data.color_hilo,
								ancho_hilo:  $('[name=cambiar_ancho_hilo]').val() || Bordado.data.ancho_hilo
							});
							console.log('Punto pintado de ' + coord[0] + ',' + coord[1] + ' a ' + coord_up);
						} else {
							$('.celda[rel="' + coord[0] + ',' + coord[1] + '"]').html('');
							this.quitar(coord[0], coord[1]);
							console.log('Punto movido de ' 	+ coord[0] + ',' + coord[1] + ' a ' + coord_up);
						}
						celda.html(punto)
							.addClass('clicked');
					}
					break;
				case 'right':
					if (parseInt(coord[0]) < (parseInt(this.data.columnas) - 1)) {
						var coord_right = (parseInt(coord[0]) + 1) + ',' + coord[1];
						celda = $('.celda[rel="' + coord_right + '"]');

						if (this.pintar) {
							this.agregar({
								coord: {
									x: (parseInt(coord[0]) + 1),
									y: coord[1]
								},
								punto: $('#punto-actual').text() || Bordado.data.punto_base,
								color_hilo: $('[name=cambiar_color_hilo]').val() || Bordado.data.color_hilo,
								ancho_hilo:  $('[name=cambiar_ancho_hilo]').val() || Bordado.data.ancho_hilo
							});
							console.log('Punto movido de ' + coord[1] + ',' + coord[0] + ' a ' + coord_right);
						} else {
							$('.celda[rel="' + coord[0] + ',' + coord[1] + '"]').html('');
							this.quitar(coord[0], coord[1]);
							console.log('Punto pintado de ' + coord[1] + ',' + coord[0] + ' a ' + coord_right);
						}
						celda.html(punto)
							.addClass('clicked');
					}
					break;
				case 'down':
					if (parseInt(coord[1]) < parseInt(this.data.filas) - 1) {
						var coord_down = coord[0] + ',' + (parseInt(coord[1]) + 1);
						celda = $('.celda[rel="' + coord_down + '"]');

						if (this.pintar) {
							this.agregar({
								coord: {
									x: coord[0],
									y: (parseInt(coord[1]) + 1)
								},
								punto: $('#punto-actual').text() || Bordado.data.punto_base,
								color_hilo: $('[name=cambiar_color_hilo]').val() || Bordado.data.color_hilo,
								ancho_hilo:  $('[name=cambiar_ancho_hilo]').val() || Bordado.data.ancho_hilo
							});
							console.log('Punto movido de ' + coord[0] + ',' + coord[1] + ' a ' + coord_down);
						} else {
							$('.celda[rel="' + coord[0] + ',' + coord[1] + '"]').html('');
							this.quitar(coord[0] + ',' + coord[1]);
							console.log('Punto pintado de ' + coord[0] + ',' + coord[1] + ' a ' + coord_down);
						}
						celda.html(punto)
							.addClass('clicked');
					}
					break;
				case 'left':
					if (parseInt(coord[0]) > 0) {
						var coord_left = (parseInt(coord[0]) - 1) + ',' + coord[1];
						celda = $('.celda[rel="' + coord_left + '"]');

						if (this.pintar) {
							this.agregar({
								coord: {
									x: (parseInt(coord[0]) - 1),
									y: coord[1]
								},
								punto: $('#punto-actual').text() || Bordado.data.punto_base,
								color_hilo: $('[name=cambiar_color_hilo]').val() || Bordado.data.color_hilo,
								ancho_hilo:  $('[name=cambiar_ancho_hilo]').val() || Bordado.data.ancho_hilo
							});
							console.log('Punto movido de ' + coord[0] + ',' + coord[1] + ' a ' + coord_left);
						} else {
							$('.celda[rel="' + coord[0] + ',' + coord[1] + '"]').html('');
							this.quitar(coord[0] + ',' + coord[1]);
							console.log('Punto pintado de ' + coord[0] + ',' + coord[1] + ' a ' + coord_left);
						}
						celda.html(punto)
							.addClass('clicked');
					}
					break;
				default:
					return;

			}

		} else {
			console.info('No hay punto para mover! Haz click en la grilla.');
		}

	},

	// Obtener coordenadas ordenandas para la grilla
	coordenadas: function() {

		return this.data.coords.map(function(e){
			return e.coord;
		}).sort(function(a,b){
			return a.x > b.y;
		});

	},

	// Obtener colores, ordenados y listos para comparar con coordenadas de la grilla
	colores: function ( data ) {
		return (data.coord.x + ',' + data.coord.y) === next_coord;
	},

	// Shuffle coordenadas (para animación)
	shuffle: function() {

		var currentIndex = this.data.coords.length,
			temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = this.data.coords[currentIndex];
			this.data.coords[currentIndex] = this.data.coords[randomIndex];
			this.data.coords[randomIndex] = temporaryValue;
		}

		return this.data.coords;
	},

	// Ordenar coordenadas
	ordenar: function() {
		this.data.coords = this.data.coords.sort(function( coord1, coord2 ){
			return coord2.coord < coord1.coord;
		});
	},

	// Agregar coordenada
	agregar: function(punto){
		var punto_nuevo = punto.coord.x + ',' + punto.coord.y,
			coords = this.data.coords.map(function(e){
				return e.coord.x + ',' + e.coord.y;
			}),
			color_hilo  = punto.color_hilo,
			ancho_hilo 	= punto.ancho_hilo,
			tipo_punto  = punto.punto;

		// Si no existe el punto, lo agregamos al objeto
		if ( coords.indexOf(punto_nuevo) == -1 ) {
			this.data.coords.push(punto);
			// Mantener las coordenas ordenadas
			//this.data.coords.sort();
			console.info('Punto generado en ' + punto_nuevo);
		} else {
			// Si ya existe, sólo actualizar color y tipo de punto
			this.data.coords[coords.indexOf(punto_nuevo)].color_hilo = color_hilo;
			this.data.coords[coords.indexOf(punto_nuevo)].ancho_hilo = ancho_hilo;
			this.data.coords[coords.indexOf(punto_nuevo)].punto 	 = tipo_punto;
		}
	},

	// Quitar coordenada
	quitar: function(coord) {
		// Loop para limpiar coordenadas repetidas (por error de usuario)
		var i = 0;
		while( typeof this.data.coords[i] != 'undefined' ){
			var index = this.data.coords.map(function(e){
					return e.coord.x + ',' + e.coord.y;
				}).indexOf(coord);
			if (index > -1) {
				this.data.coords.splice(index, 1);
				// Mantener las coordenas ordenadas
				//this.data.coords.sort();

				$('.celda[rel="' + coord + '"]').html(' ').removeClass('clicked');

				console.info('Punto elminado de ' + coord);
			}
			i++;
		}
	},

	// Generar png
	render: function(img_name, show_alert) {
		var Bordado = this;
		var bordado_html = $('.caneva');
		
		// html2canvas(bordado_html, canvas).then(function(canvas) {
        //     console.log('Drew on the existing canvas');
		// 	Bordado.png(canvas, img_name);
        // });
		
		html2canvas(bordado_html, {
			
			onrendered: function(canvas) {
				// Generar PNG y guardarlo
				//document.body.appendChild(canvas);
				Bordado.png(canvas, img_name, show_alert);
			},
			
		});
	},
	
	// Guardar PNG
	png: function(canvas, img_name, show_alert) {
		
		var Bordado = this;
        
        show_alert = show_alert || false;
		
		var img = {};
		// Convert canvas to base64 PNG string 
		img.data = canvas.toDataURL('image/png');
		// Remove the base64 header (so it can be converted to file)
		img.data = img.data.replace(/data:image\/png;base64,/, '');
		// Set image name
		img.name = img_name || Bordado.data.bordado;
		// Set image id (to be used as folder name)
		img.id = Bordado.data.id;
		
		$.ajax({
			url: '/bordados/renders/save',
			method: 'post',
			dataType: 'json',
			data: { 
				image: img.data, 
				bordado: img.name,
				id: img.id
			},
			success: function(res){
				if ( res.message == 'ok' ) {
					console.info('PNG ' + img.name + ' guardado');
					$('.save-frame-message').html(
						'<small>Frame guardado!</small>'
					);
                    if ( show_alert ) {
                        BootstrapDialog.alert({
                            title: 'Generar Frame PNG',
                            message: 'Frame guardado!'
                        });
                    }
				}
			},
			error: function(err) {
				console.log(err);
			}
		});
		
	},
    
    addRow: function() {
        
        var filas 		= parseInt(this.data.filas),
			columnas 	= parseInt(this.data.columnas),
			ancho 		= parseInt(this.data.ancho_punto)
            celda       = '',
            // new row number (last row + 1)
            h = parseInt($('.celda:last-child').attr('rel').split(",")[1]) + 1;
            
        this.height = this.height + ancho;
        this.data.filas++;
        
        console.log(this.height);
            
        for ( var x = 0; x <= columnas; x++ ){
            
            celda = '<div data-toogle="tooltip" data-title="' + x + ',' + h + 
                '" class="celda' + ( x == 0 ? 'primera-linea' : '' ) + 
                '" style="width: ' + ancho + 'px; height: ' + ancho + 'px;"' +
                (!this.debug_coords ? '' : ' style="font-size:9px;line-height:20px;""') +
                ' rel="' + x + ',' + h + '">' +
                (!this.debug_coords ? ' ' : x + ',' + h) +
                '</div>';
            
            $('.' + this.contenedor).css({ height: this.height + 'px' }).append( celda );
        }
        $('.celda').css({
            borderLeft: '1px solid ' + this.data.color_malla,
            borderBottom: '1px solid ' + this.data.color_malla
        });
        
        // Registrar eventos
        this.eventos();
        
    }
    
};
