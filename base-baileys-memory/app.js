// Suggested code may be subject to a license. Learn more: ~LicenseLog:3591953618.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2744116807.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:664549028.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:702062939.
const dotenv = require("dotenv");

const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const axios = require('axios')
const { reduceBinaryNodeToDictionary, delay, cleanMessage } = require('@whiskeysockets/baileys')
// Configuración de AppSheet
const APPSHEET_API_URL = 'https://api.appsheet.com/api/v2/apps/bccce12a-4469-46ea-9de3-d4a09ba4f316/tables/personal/Action'
const APPSHEET_API_KEY = 'V2-LGQA6-8OWxX-m3j9Z-IvSUD-COZrU-AlrCf-O0doo-jv8yA'
const APPSHEET_API_URL_GERENCIAS = 'https://api.appsheet.com/api/v2/apps/bccce12a-4469-46ea-9de3-d4a09ba4f316/tables/gerencias/Action'; // URL para leer datos

// Configuración de OpenAI
const chat = require('./src/scripts/gemini.js')


dotenv.config();

const activeUsers = new Map(); // Mapa para rastrear usuarios y su timeout

const flowHola = addKeyword('helado')
    .addAnswer('¡Hola! ¿En qué puedo ayudarte?')
    .addAction(async (ctx, { flowDynamic }) => {
        const userId = ctx.from; 

        // Si el usuario ya tenía un timeout activo, lo limpiamos antes de crear uno nuevo
        if (activeUsers.has(userId)) {
            clearTimeout(activeUsers.get(userId));
        }

        // Creamos un timeout de 5 minutos (300000 ms)
        const timeout = setTimeout(async () => {
            await flowDynamic('Parece que estuviste inactivo. Si necesitas ayuda, escribe "hola" de nuevo.');
            activeUsers.delete(userId); // Eliminamos al usuario del mapa cuando se notifica
        }, 300000); 

        // Guardamos el timeout en el mapa
        activeUsers.set(userId, timeout);
    });

const flowSalir = addKeyword(['salir', 'exit'])
.addAnswer('⏳✨ ¡Ayudarte es mi misión! 🤖 Cuando requieras ayuda nuevamente, solo escribe *"Hola"* y estaré listo para asistirte. 🚀 ¡Hasta pronto! 🙌')
.addAction(async (ctx,{endFlow}) => {
    return endFlow(); // Finaliza la conversación
});

const registerFlow = addKeyword(['1','registrar','Registrar','registro','Registro','registra','Registra'],{ sensitive: true })
    .addAnswer('¡Entendido! 👋 Vamos a registrar un usuario en la app de Citas. Por favor, sigue las instrucciones.   ')
    .addAnswer(`¿Te parece si empezamos, cual es el nombre completo? ✍️ `, { capture: true }, async (ctx, { state,fallBack,flowDynamic,endFlow }) => {
            
      var nombreUsuario = ctx.body
      // Validación del nombre
      const nombreRegex = /^[a-zA-ZÀ-ÿñÑ][a-zA-ZÀ-ÿñÑ\s'-]{2,}$/;
      if (!nombreRegex.test(nombreUsuario)) {
        return fallBack('⚠️❌ Por favor, ingresa un nombre válido. 😊✍️.')
      }
      await state.update({ nombreUsuario: nombreUsuario })
      //await state.update({ name: ctx.body })
      
    })
    .addAnswer('✅🤔 El nombre de usuario ingresado, ¿es correcto? (🟢 Sí / 🔴 No)', { capture: true }, async (ctx, { state,fallBack }) => {
      const respuesta = ctx.body.toUpperCase() // Captura la respuesta del usuario y la convierte en minúsculas
      if (ctx.body.toUpperCase() === 'SI') {
        // Si el usuario confirma que el nombre es correcto, continuar con el flujo
      }else if (ctx.body.toUpperCase() === 'NO') {
        // Si el usuario dice que no es correcto, solicitar el nombre nuevamente
        return fallBack('Por favor, ingresa el nombre completo nuevamente. ✍️')
      }else{
        // Manejo de respuestas inválidas
        console.log('Respuesta del usuario:', respuesta)
        await state.update({ nombreUsuario: respuesta })
        return fallBack('✅🤔 El nombre de usuario ingresado, ¿es correcto? "SI" ✅ o "NO" ❌ para continuar.');
        } 
        //await state.update({ age: ctx.body })
    })
    .addAnswer('Muy bien!,  😄 Ahora necesito el correo electrónico 📧', { capture: true }, async (ctx, { state,fallBack }) => {
      const emailUsuario = ctx.body
      // Validación del correo electrónico
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailUsuario)) {
        return fallBack('El correo electrónico no es válido. Por favor, ingrésalo nuevamente. 📧');
      }
      await state.update({ emailUsuario: emailUsuario })
          //await state.update({ age: ctx.body })
    })
    .addAnswer('¡Perfecto! 🎉 ¿Cuál es el número de celular? 📱', { capture: true }, async (ctx, { state,fallBack }) => {
      const celUsuario = ctx.body
      // Validación del número de celular (mínimo 10 dígitos)
      const telefonoRegex = /^\d{10}$/;
      if (!telefonoRegex.test(celUsuario)) {
        return fallBack('El número de celular no es válido. Por favor, ingrésalo nuevamente. 📱');
      }
      await state.update({ celUsuario: celUsuario })
            //await state.update({ age: ctx.body })
    })
    .addAnswer('¡Gracias! Ahora, para finalizar, ¿puedes decirme el numero del distribuidor con quien trabaja? 🤝', { capture: true }, async (ctx, { state,fallBack,flowDynamic }) => {
      const distribucionUsuario = ctx.body
      // El número de teléfono se encuentra antes de "@s.whatsapp.net"
      const numeroCelular = ctx.key.remoteJid.split('@')[0]; 
      console.log('Número de celular obtenido de Baileys:', numeroCelular);

      const { nombreUsuario, emailUsuario, celUsuario } = await state.getMyState()
      console.log('Datos a enviar:', { nombreUsuario, emailUsuario, distribucionUsuario, celUsuario })

      var distribucionNombre=""
      var distribucionId=""
      var nombreUsuarioMayus=nombreUsuario.toUpperCase();

      const payloadBurcarGerente = {
        "Action": "Find",
        "Properties": {
          "Locale": "es-ES"
        },
        "Rows": [
          
        ]
      }
      
      try {
        const response = await axios.post(APPSHEET_API_URL_GERENCIAS, payloadBurcarGerente, {
          headers: {
            'ApplicationAccessKey': APPSHEET_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        //console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
        if (response.status === 200 && response.data.length > 0) {  
          const personal = response.data.filter(persona => persona['No Distribuidor'] === distribucionUsuario);
          console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
          if (personal.length > 0) {
            let personalMsg = 'Distribuidor encontrado procedo a la alta:';
            personal.forEach((persona, index) => {
              //personalMsg += `${index + 1}. Distribución: ${persona['No Distribuidor']}, Gerente: ${persona['Gerente']}, IdGerencia: ${persona['IdGerencia']}, Status: ${persona.Status}`;
              distribucionNombre=persona['Gerente'];
              distribucionId=persona['IdGerencia'];
            });
            await flowDynamic(personalMsg);
                  
            try {
              const response = await axios.post(APPSHEET_API_URL, payloadBurcarGerente, {
                headers: {
                  'ApplicationAccessKey': APPSHEET_API_KEY,
                  'Content-Type': 'application/json'
                }
              });
              
              //console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
              if (response.status === 200 && response.data.length > 0) {
                const personal = response.data.filter(persona => persona['Telefono'] === numeroCelular.substring(3, 13));
                console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
                if (personal.length > 0) {
                  const payload = {
                    "Action": "Add",
                    "Properties": {
                      "Locale": "es-ES"
                    },
                    "Rows": [
                      {
                        "Nombre": nombreUsuarioMayus,
                        "Foto": "Personal_Images/7.Foto.221732.png",
                        "Comision Origen Venta": 0.10,
                        "Comision Cierre Venta": 0.15,
                        "Email": emailUsuario,
                        "Gerente": distribucionNombre,
                        "IdGerente": distribucionId,
                        "Telefono": celUsuario,
                        "Puesto": "EMPRENDEDOR",
                        "Turno": "Mixto",
                        "Rol": "CAMPO",
                        "Nick": numeroCelular,
                        "Checa":"NO",
                        "Password":Math.floor(10000+Math.random()*90000),
                        "Estado del Registro": "ACTIVO"
                                  
                      }
                    ]
                  }
                  console.log('Payload completo:', JSON.stringify(payload, null, 2))
                  try {
                    const response = await axios.post(APPSHEET_API_URL, payload, {
                      headers: {
                        'ApplicationAccessKey': APPSHEET_API_KEY,
                        'Content-Type': 'application/json'
                      }
                    })
                    console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2))
                    if (response.status === 200) {
                      await flowDynamic(` ✅ ¡Registro exitoso!\nBienvenido/a, ${nombreUsuario}\nTu correo electrónico registrado es: ${emailUsuario}\nCelular: ${celUsuario}\nDistribuidor: ${distribucionNombre}\n\n¿Deseas realizar algo más?🤔\n✅Escribe *MENÚ* para regresar al inicio.` )
                    } else {
                      console.error('Respuesta inesperada de AppCitas:', response.status, response.statusText)
                      await flowDynamic('Hubo un problema al registrar el usuario. Por favor, intenta nuevamente.')
                    }
                  } catch (error) {
                    console.error('Error al registrar el usuario:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message)
                    console.error('Stack trace:', error.stack)
                    await flowDynamic('Ocurrió un error al registrar el usuario. Por favor, intenta más tarde.')
                    }
                } else {
                    await flowDynamic('🔒 Solo personal autorizado puede registrar usuarios en AppCitas. \n¿Deseas realizar algo más? 🤔\n ✅ Escribe *MENÚ* para regresar al inicio.');
                  }
              } else {
                  await flowDynamic('error a obtener datos.');
                }
                        
            } 
            catch (error) {
              console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
              console.error('Stack trace:', error.stack);
              await flowDynamic('Ocurrió un error al consultar los datos de la distibucion. Por favor, intenta más tarde.');
            }
                
                  
    
                  
          } else {
              return fallBack('🔴 Número de Distribuidor No Existe, Por favor, ingrésalo nuevamente\n');
            }
        } else {
            await flowDynamic('No se encontro distribucion con el numero especificado.');
        }
      } catch (error) {
          console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al consultar los datos de la distibucion. Por favor, intenta más tarde.');
      }
    })
    //.addAction(async (_, { flowDynamic, state }) => {
    //    await flowDynamic(`${state.get('nombreUsuario')}, thanks for your information!: Your age: ${state.get('age')}`)
    //})

const flowWelcome = addKeyword('ia')
  .addAnswer('👋  ¡Hola Bienvenido! Soy el asistente virtual de *GROWTH HACKING*')
  .addAnswer(' ¿En que puedo ayudarte?', {delay:800, capture: true }, 
    async (ctx,{flowDynamic} ) => {
      // El número de teléfono se encuentra antes de "@s.whatsapp.net" solo estara disponible para propietarios
      const numeroCelular = ctx.key.remoteJid.split('@')[0]; 
      console.log('Número de celular obtenido de Baileys:', numeroCelular);  

      const payload = {
        "Action": "Find",
        "Properties": {
          "Locale": "es-ES"
        },
        "Rows": [
              
        ]
      }

      try {
          const response = await axios.post(APPSHEET_API_URL, payload, {
            headers: {
              'ApplicationAccessKey': APPSHEET_API_KEY,
              'Content-Type': 'application/json'
            }
          });
           
          //console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
          if (response.status === 200 && response.data.length > 0) {
            const personal_TODOS = response.data.filter(personal => personal.Telefono.length > 0);
            // Convertir a JSON
            const personal_TODOS_JSON = JSON.stringify(personal_TODOS, null, 2);
            if (personal_TODOS.length > 0) {
              //const gerenteConsulta = personalAux[0].IdGerente;
              console.log('NumeroCelular:',numeroCelular);
              const personal_AUTORIZADO = response.data.filter(personal => personal.Telefono === numeroCelular.substring(3, 13) && personal['Rol'] === 'PROPIETARIO');
              console.log('Respuesta Personal Autorizado:', personal_AUTORIZADO.length);
              if (personal_AUTORIZADO.length > 0) {
                //let personalMsg = `📋 Aquí tienes tu información:\nGERENCIA: ${personalAux[0].Gerente}\n`;
                
                //personal.forEach((persona, index) => {
                //  let numero = String(index + 1).padStart(2, '0'); // Asegura dos dígitos
                //  personalMsg += `${numero}.- ${persona['Nombre'].substring(0, 25)}\n`;
                  
                  //if (numeroCelular===(`521`+personal_AUTORIZADO.Telefono.toString())) {
                    //Consulta a la inteligencia articifial
                    const prompt ="Eres un asistente estadistico que tienes acceso a mi personal. Te voy a consultar sobre eso.";
                    console.log("paso por aqui 1")
                    const text = ctx.body+"\n mi personal es: "+ personal_TODOS_JSON;
                    console.log("paso por aqui 2")
                    const respuesta = await chat(prompt, text);
                    console.log("IA respondio:", respuesta);
                    return await flowDynamic(respuesta);

                  //}else{
                      //personalMsg +=`\n¿Necesitas algo más?🤔\n✅ Escribe *MENÚ* para regresar al inicio.\n`;
                  //}
                //});
                //personalMsg +=`\n¿Necesitas algo más?🤔\n✅ Escribe *MENÚ* para regresar al inicio.\n`;
                //await flowDynamic(personalMsg);
              } else {
                await flowDynamic('⚠️ No se encontró personal registrado\n');
              }
            } else {
              await flowDynamic('⚠️ No se encontró personal registrado\n');
              }
          }
        } catch (error) {
          console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al consultar los datos. Por favor, intenta más tarde.');
        }


        
    
        
    });

//const flowWeb = addKeyword(['web'], { sensitive: true ,RegExp:/^(?!\b(1|registrar|2|consultar|3|baja|4|reactivar|5|mostrar|chatbot|Chatbot|menu)\b).+$/i}) 
//  .addAnswer('⚠️ Opción no válida. \n¿Deseas realizar algo más? 🤔\n\n ✅ Escribe *MENÚ* para regresar al inicio.', null, async (ctx, { gotoFlow }) => {
    
//  });
  
const flowRegistrarUsuario = addKeyword(['ninguna'],{ sensitive: true })
  .addAnswer('¡Entendido! 👋 Vamos a registrar un usuario en la app de Citas. Por favor, sigue las instrucciones.   ')
  .addAnswer('¿Te parece si empezamos, cual es el nombre completo? ✍️ ', { capture: true }, async (ctx, {fallBack , state }) => {
    var nombreUsuario = ctx.body
    // Validación del nombre
    const nombreRegex = /^[a-zA-ZÀ-ÿñÑ][a-zA-ZÀ-ÿñÑ\s'-]{2,}$/;
    if (!nombreRegex.test(nombreUsuario)) {
      return fallBack('Por favor, ingresa un nombre válido.')
    }
    await state.update({ nombreUsuario: nombreUsuario })
       
  })
  
  .addAnswer(`El nombre de usuario ingresado, ¿Es correcto? (Sí/No)`,{ capture: true },async (ctx2, {fallBack, flowDynamic, state }) => {
    const respuesta = ctx2.body.toUpperCase() // Captura la respuesta del usuario y la convierte en minúsculas
    if (ctx2.body.toUpperCase() === 'SI') {
      // Si el usuario confirma que el nombre es correcto, continuar con el flujo
    }else if (ctx2.body.toUpperCase() === 'NO') {
      // Si el usuario dice que no es correcto, solicitar el nombre nuevamente
      return fallBack('Por favor, ingresa tu nombre completo nuevamente. ✍️')
    }else{
      // Manejo de respuestas inválidas
      console.log('Respuesta del usuario:', respuesta)
      await state.update({ nombreUsuario: respuesta })
      return fallBack('Por favor, responde "sí" o "no" para continuar.');
      } 
    }
  )

  .addAnswer('Muy bien!,  😄 Ahora necesito el correo electrónico 📧 ', { capture: true }, async (ctx, {fallBack, flowDynamic, state }) => {
    const emailUsuario = ctx.body
    // Validación del correo electrónico
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailUsuario)) {
      return fallBack('El correo electrónico no es válido. Por favor, ingrésalo nuevamente. 📧');
    }
    await state.update({ emailUsuario: emailUsuario })
  })

  .addAnswer('¡Perfecto! 🎉 ¿Cuál es el número de celular? 📱', { capture: true }, async (ctx, {fallBack, flowDynamic, state }) => {
    const celUsuario = ctx.body
    // Validación del número de celular (mínimo 10 dígitos)
    const telefonoRegex = /^\d{10}$/;
    if (!telefonoRegex.test(celUsuario)) {
      return fallBack('El número de celular no es válido. Por favor, ingrésalo nuevamente. 📱');
    }
    await state.update({ celUsuario: celUsuario })
    //await flowDynamic(`celular: ${celUsuario}. Por ultimo, `)
  })

  .addAnswer('¡Gracias! Ahora, para finalizar, ¿puedes decirme el numero del distribuidor con quien trabaja? 🤝', { capture: true }, async (ctx, {fallBack, flowDynamic, state }) => {
    const distribucionUsuario = ctx.body
    // El número de teléfono se encuentra antes de "@s.whatsapp.net"
    const numeroCelular = ctx.key.remoteJid.split('@')[0]; 
    console.log('Número de celular obtenido de Baileys:', numeroCelular);

    const { nombreUsuario, emailUsuario, celUsuario } = await state.getMyState()
    console.log('Datos a enviar:', { nombreUsuario, emailUsuario, distribucionUsuario, celUsuario })
    
    const prompt ="Basado en tu conocimiento determina el nombre ingresado por el usuario es de hombre o mujer.Responde solo con 'hombre','mujer'.";
    const text = nombreUsuario;
    const respuesta = await chat(prompt, text);
    console.log(respuesta.text);
    var foto=""
    if(respuesta.text==='hombre')
    {
      foto="Personal_Images/7.Foto.221732.png"
    }
    else{
      foto="Personal_Images/29.Foto.220448.png"
    }
    await state.update({ foto: foto })
    console.log(foto)

    var distribucionNombre=""
    var distribucionId=""
    var nombreUsuarioMayus=nombreUsuario.toUpperCase();

    const payloadBurcarGerente = {
      "Action": "Find",
      "Properties": {
        "Locale": "es-ES"
      },
      "Rows": [
        
      ]
    }
    
    try {
      const response = await axios.post(APPSHEET_API_URL_GERENCIAS, payloadBurcarGerente, {
        headers: {
          'ApplicationAccessKey': APPSHEET_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      //console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
      if (response.status === 200 && response.data.length > 0) {
        const personal = response.data.filter(persona => persona['No Distribuidor'] === distribucionUsuario);
        console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
        if (personal.length > 0) {
          let personalMsg = 'Distribuidor encontrado procedo a la alta:';
          personal.forEach((persona, index) => {
            //personalMsg += `${index + 1}. Distribución: ${persona['No Distribuidor']}, Gerente: ${persona['Gerente']}, IdGerencia: ${persona['IdGerencia']}, Status: ${persona.Status}`;
            distribucionNombre=persona['Gerente'];
            distribucionId=persona['IdGerencia'];
          });
          await flowDynamic(personalMsg);
                
          try {
            const response = await axios.post(APPSHEET_API_URL, payloadBurcarGerente, {
              headers: {
                'ApplicationAccessKey': APPSHEET_API_KEY,
                'Content-Type': 'application/json'
              }
            });
            
            //console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
            if (response.status === 200 && response.data.length > 0) {
              const personal = response.data.filter(persona => persona['Telefono'] === numeroCelular.substring(3, 13));
              console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
              if (personal.length > 0) {
                const payload = {
                  "Action": "Add",
                  "Properties": {
                    "Locale": "es-ES"
                  },
                  "Rows": [
                    {
                      //"IdPersonal":"219",
                      "Nombre": nombreUsuarioMayus,
                      "Foto": foto,
                      "Comision Origen Venta": "10%",
                      "Comision Cierre Venta": "15%",
                      "Email": emailUsuario,
                      "Gerente": distribucionNombre,
                      "IdGerente": distribucionId,
                      "Telefono": celUsuario,
                      "Puesto": "EMPRENDEDOR",
                      "Turno": "Mixto",
                      "Rol": "CAMPO",
                      "Nick": nombreUsuarioMayus,// numeroCelular,
                      "Checa":1,
                      "Password":Math.floor(10000+Math.random()*90000),
                      "Estado del Registro": "ACTIVO"
                                
                    }
                  ]
                }
                console.log('Payload completo:', JSON.stringify(payload, null, 2))
                try {
                  const response = await axios.post(APPSHEET_API_URL, payload, {
                    headers: {
                      'ApplicationAccessKey': APPSHEET_API_KEY,
                      'Content-Type': 'application/json'
                    }
                  })
                  console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2))
                  if (response.status === 200) {
                    await flowDynamic(` ✅ ¡Registro exitoso!\nBienvenido/a, ${nombreUsuario}\nTu correo electrónico registrado es: ${emailUsuario}\nCelular: ${celUsuario}\nDistribuidor: ${distribucionNombre}\n\n¿Deseas realizar algo más?🤔\n✅Escribe *MENÚ* para regresar al inicio.` )
                  } else {
                    console.error('Respuesta inesperada de AppCitas:', response.status, response.statusText)
                    await flowDynamic('Hubo un problema al registrar el usuario. Por favor, intenta nuevamente.')
                  }
                } catch (error) {
                  console.error('Error al registrar el usuario:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message)
                  console.error('Stack trace:', error.stack)
                  await flowDynamic('Ocurrió un error al registrar el usuario. Por favor, intenta más tarde.')
                  }
              } else {
                  await flowDynamic('🔒 Solo personal autorizado puede registrar usuarios en AppCitas. \n¿Deseas realizar algo más? 🤔\n ✅ Escribe *MENÚ* para regresar al inicio.');
                }
            } else {
                await flowDynamic('error a obtener datos.');
              }
                      
          } 
          catch (error) {
            console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
            console.error('Stack trace:', error.stack);
            await flowDynamic('Ocurrió un error al consultar los datos de la distibucion. Por favor, intenta más tarde.');
          }
               
                
  
                
        } else {
            return fallBack('🔴 Número de Distribuidor No Existe, Por favor, ingrésalo nuevamente\n');
          }
      } else {
          await flowDynamic('No se encontro distribucion con el numero especificado.');
      }
    } catch (error) {
        console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        console.error('Stack trace:', error.stack);
        await flowDynamic('Ocurrió un error al consultar los datos de la distibucion. Por favor, intenta más tarde.');
    }

  })

  const flowConsulta = addKeyword(['2','consulta','Consulta','consultar'],{ sensitive: true })
    .addAnswer('Hola! 👋 Vamos a consultar su informacion registrada. Por favor, sigue las instrucciones.')
    .addAnswer('¿Cuál es su Email registrado? ✍️', { capture: true }, async (ctx, {fallBack,flowDynamic, state }) => {     
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(ctx.body)) {
        return fallBack('Por favor, ingresa un email válido.');
      }

      const emailConsulta = ctx.body;
      console.log('Email a consultar:', emailConsulta);

      const numeroCelular = ctx.key.remoteJid.split('@')[0]; // El número de teléfono se encuentra antes de "@s.whatsapp.net"
      console.log('Número de celular obtenido de Baileys:', numeroCelular);

      const payload = {
        "Action": "Find",
        "Properties": {
          "Locale": "es-ES"
        },
        "Rows": [
              
        ]
      }

      try {
          const response = await axios.post(APPSHEET_API_URL, payload, {
            headers: {
              'ApplicationAccessKey': APPSHEET_API_KEY,
              'Content-Type': 'application/json'
            }
          });
           
          //console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
          if (response.status === 200 && response.data.length > 0) {
            const personal = response.data.filter(persona => persona.Email === emailConsulta);
            console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
            if (personal.length > 0) {
              let personalMsg = '📋 Aquí tienes tu información: \n';
              personal.forEach((persona, index) => {
                personalMsg += `Status: ${persona['Estado del Registro']},\nNombre: ${persona['Nombre']},\nPuesto: ${persona['Puesto']},\nDistribución: ${persona.Gerente},\nEmail: ${persona.Email},\n`;
                if (numeroCelular===(`521`+persona.Telefono.toString())) {
                  const fechaInicio = new Date(persona['Fecha de Alta']); 
                  const fechaFin = new Date(Date.now());

                  // Calcular la diferencia en milisegundos
                  const diferenciaMilisegundos = fechaFin - fechaInicio;

                  // Convertir milisegundos a días
                  const milisegundosPorDia = 1000 * 60 * 60 * 24;
                  const diferenciaDias = Math.ceil(diferenciaMilisegundos / milisegundosPorDia);

                  console.log('Fecha Inicio:', fechaInicio,'Fecha Fin:', fechaFin,'Diferencia:', diferenciaDias);

                 if (diferenciaDias>10) {
                    personalMsg +=`Password: ${persona['Password']}\n`;
                  }
                   personalMsg +=`\n¿Necesitas algo más?🤔\n✅ Escribe *MENÚ* para regresar al inicio.\n`;
                  }else{
                    personalMsg +=`\n¿Necesitas algo más?🤔\n✅ Escribe *MENÚ* para regresar al inicio.\n`;
                  }
              });
              await flowDynamic(personalMsg);
            } else {
              await flowDynamic('⚠️ No se encontró personal con el email especificado. Recuerda que se distingue entre mayúsculas y minúsculas.\n\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
            }
          } else {
            await flowDynamic('⚠️ No se encontró personal con el email especificado. Recuerda que se distingue entre mayúsculas y minúsculas\n\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
            }
      } catch (error) {
          console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al consultar los datos. Por favor, intenta más tarde.');
        }
    });

  const flowBaja = addKeyword(['3','baja','Baja'],{ sensitive: true },{ sensitive: true })
    .addAnswer('Hola! 👋 Vamos a actualizar su información registrada. Por favor, sigue las instrucciones.')
    .addAnswer('¿Cuál es su Email registrado? ✍️', { capture: true }, async (ctx, { flowDynamic, state }) => {
      const emailConsulta = ctx.body.trim();
      console.log('Email a consultar:', emailConsulta);
        
      const numeroCelular = ctx.key.remoteJid.split('@')[0]; // El número de teléfono se encuentra antes de "@s.whatsapp.net"
      console.log('Número de celular obtenido de Baileys:', numeroCelular);

      var IdPersonal="";
      var Autorizacion=false;
      const payload0 = {
        "Action": "Find",
        "Properties": {
          "Locale": "es-ES"
        },
        "Rows": [
            
        ]
      }

      try {
        const response = await axios.post(APPSHEET_API_URL, payload0, {
          headers: {
              'ApplicationAccessKey': APPSHEET_API_KEY,
              'Content-Type': 'application/json'
          }
        });

        console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
        if (response.status === 200 && response.data.length > 0) {
          const personal = response.data.filter(persona => persona.Email === emailConsulta);
          console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
          if (personal.length > 0 ) {
            let personalMsg = 'Personal encontrado:\n';
            personal.forEach((persona, index) => {
              personalMsg += `Distribucion:${persona['Gerente']},\nPuesto: ${persona['Puesto']},\nNombre: ${persona['Nombre']},\nEmail: ${persona.Email},\nProcedo a la BAJA `;
              IdPersonal=persona.IdPersonal;
            });
                  
            const personal2 = response.data.filter(persona => persona.Telefono === numeroCelular.substring(3, 13));
            console.log('Respuesta completa 3 de AppSheet:', personal2.length);
            if (personal2.length > 0 ){
              await flowDynamic(personalMsg);
              personal2.forEach((persona, index) => {
                if(persona['Rol']==="ADMIN"){
                  Autorizacion=true;
                }
              }); 
            }

          } else {
              await flowDynamic('⚠️ No se encontró personal con el email especificado.\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
            }
        } else {
            await flowDynamic('⚠️ No se encontró personal con el email especificado.\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
          }
      } catch (error) {
          console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al consultar los datos. Por favor, intenta más tarde.');
        }
        
        
      if (Autorizacion===true){
        console.log('IdPersonal a enviar:', { IdPersonal });
        const payload = {
          "Action": "Edit",
          "Properties": {
            "Locale": "es-ES"
          },
          "Rows": [
            {
              "IdPersonal": IdPersonal,
              "Email": emailConsulta,
              "Estado del Registro": "BAJA"
            }
          ]
        }
        
        console.log('Payload completo:', JSON.stringify(payload, null, 2))
        try {
          const response = await axios.post(APPSHEET_API_URL, payload, {
            headers: {
              'ApplicationAccessKey': APPSHEET_API_KEY,
              'Content-Type': 'application/json'
            }
          });

          console.log('Respuesta de AppSheet:', JSON.stringify(response.data, null, 2));
          console.log('Respuesta de AppSheet:', response.status);
          console.log('Respuesta de AppSheet:', response.length);
            
          if (response.status === 200 ) {
           await flowDynamic(`✅ El status ha sido actualizado exitosamente a 🔻BAJA para el email: ${emailConsulta}. \n\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.`);
          } else {
           await flowDynamic('No se pudo actualizar el status. Verifique que el email sea correcto y que existe en la base de datos.');
          }
        } catch (error) {
          console.error('Error al actualizar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al actualizar los datos. Por favor, intenta más tarde.');
        }
      }
      else
      {
        await flowDynamic('⚠️ Requieres tener permisos de administrador para realizar esta acción.\n❌ BAJA no realizada.\n\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio. ');
      }  
    });

  const flowReactivar = addKeyword(['4',' Reactivar','reactivar'],{ sensitive: true })
    .addAnswer('Hola! 👋 Vamos a actualizar su información registrada. Por favor, sigue las instrucciones.')
    .addAnswer('¿Cuál es su Email registrado? ✍️', { capture: true }, async (ctx, { flowDynamic, state }) => {
      const emailConsulta = ctx.body.trim();
      console.log('Email a consultar:', emailConsulta);
      var IdPersonal="";
      const payload0 = {
        "Action": "Find",
        "Properties": {
          "Locale": "es-ES"
        },
        "Rows": [
            
        ]
      }
      try {
        const response = await axios.post(APPSHEET_API_URL, payload0, {
          headers: {
            'ApplicationAccessKey': APPSHEET_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
        if (response.status === 200 && response.data.length > 0) {
          const personal = response.data.filter(persona => persona.Email === emailConsulta);
          console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
          if (personal.length > 0) {
            let personalMsg = 'Personal encontrado:\n';
            personal.forEach((persona, index) => {
              personalMsg += `${index + 1}. Puesto: ${persona['Puesto']}, Nombre: ${persona['Nombre']}, Email: ${persona.Email}\n`;
              IdPersonal=persona.IdPersonal;
            });
            await flowDynamic(personalMsg);
          } else {
            await flowDynamic('⚠️ No se encontró personal con el email especificado.\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
          }
        } else {
          await flowDynamic('⚠️ No se encontró personal con el email especificado.\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
        }
      } catch (error) {
          console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al consultar los datos. Por favor, intenta más tarde.');
      }
       
      console.log('IdPersonal a enviar:', { IdPersonal });
      const payload = {
        "Action": "Edit",
        "Properties": {
          "Locale": "es-ES"
        },
        "Rows": [
          {
            "IdPersonal": IdPersonal,
            "Email": emailConsulta,
            "Estado del Registro": "ACTIVO"
          }
        ]
      }
        
      console.log('Payload completo:', JSON.stringify(payload, null, 2))
      try {
        const response = await axios.post(APPSHEET_API_URL, payload, {
          headers: {
            'ApplicationAccessKey': APPSHEET_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        console.log('Respuesta de AppSheet:', JSON.stringify(response.data, null, 2));
        console.log('Respuesta de AppSheet:', response.status);
        console.log('Respuesta de AppSheet:', response.length);
            
        if (response.status === 200 ) {
          await flowDynamic(`✅ El status ha sido actualizado exitosamente a 🟢 ACTIVO para el email ${emailConsulta} \n\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.`);
        } else {
            await flowDynamic('No se pudo actualizar el status. Verifique que el email sea correcto y que existe en la base de datos.');
          }
      } catch (error) {
          console.error('Error al actualizar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al actualizar los datos. Por favor, intenta más tarde.');
    }
        
    });

    const flowMostrar = addKeyword(['5','mostrar','Mostrar','MOSTRAR'	],{ sensitive: true })
    .addAnswer('Hola! 👋 Vamos a consultar su equipo de trabajo. Por favor, sigue las instrucciones.')
    .addAnswer('¿Cuál es su Email registrado? ✍️', { capture: true }, async (ctx, {fallBack,flowDynamic, state }) => {     
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(ctx.body)) {
        return fallBack('Por favor, ingresa un email válido. 📧');
      }

      const emailConsulta = ctx.body;
      console.log('Email a consultar:', emailConsulta);

      const numeroCelular = ctx.key.remoteJid.split('@')[0]; // El número de teléfono se encuentra antes de "@s.whatsapp.net"
      console.log('Número de celular obtenido de Baileys:', numeroCelular);

      const payload = {
        "Action": "Find",
        "Properties": {
          "Locale": "es-ES"
        },
        "Rows": [
              
        ]
      }

      try {
          const response = await axios.post(APPSHEET_API_URL, payload, {
            headers: {
              'ApplicationAccessKey': APPSHEET_API_KEY,
              'Content-Type': 'application/json'
            }
          });
           
          //console.log('Respuesta completa de AppSheet:', JSON.stringify(response.data, null, 2));
          if (response.status === 200 && response.data.length > 0) {
            const personalAux = response.data.filter(persona => persona.Email === emailConsulta);
            if (personalAux.length > 0) {
              const gerenteConsulta = personalAux[0].IdGerente;
              console.log('gerenteConsulta:',gerenteConsulta);
              const personal = response.data.filter(persona => persona.IdGerente === gerenteConsulta && persona['Estado del Registro'] === 'ACTIVO');
              console.log('Respuesta completa 2 de AppSheet:', JSON.stringify(personal.data, null, 2));
              if (personal.length > 0) {
                let personalMsg = `📋 Aquí tienes tu información:\nGERENCIA: ${personalAux[0].Gerente}\n`;
                
                personal.forEach((persona, index) => {
                  let numero = String(index + 1).padStart(2, '0'); // Asegura dos dígitos
                  personalMsg += `${numero}.- ${persona['Nombre'].substring(0, 25)}\n`;
                  //if (numeroCelular===(`521`+persona.Telefono.toString())) {
                  //  const fechaInicio = new Date(persona['Fecha de Alta']); 
                  //  const fechaFin = new Date(Date.now());

                    // Calcular la diferencia en milisegundos
                  //  const diferenciaMilisegundos = fechaFin - fechaInicio;

                    // Convertir milisegundos a días
                  //  const milisegundosPorDia = 1000 * 60 * 60 * 24;
                  //  const diferenciaDias = Math.ceil(diferenciaMilisegundos / milisegundosPorDia);

                  //  console.log('Fecha Inicio:', fechaInicio,'Fecha Fin:', fechaFin,'Diferencia:', diferenciaDias);

                  //  if (diferenciaDias>10) {
                  //      personalMsg +=`Password: ${persona['Password']}\n`;
                  //  }
                  //  personalMsg +=`\n¿Necesitas algo más?🤔\n✅ Escribe *MENÚ* para regresar al inicio.\n`;
                  //}else{
                  //    personalMsg +=`\n¿Necesitas algo más?🤔\n✅ Escribe *MENÚ* para regresar al inicio.\n`;
                  //}
                });
                personalMsg +=`\n¿Necesitas algo más?🤔\n✅ Escribe *MENÚ* para regresar al inicio.\n`;
                await flowDynamic(personalMsg);
              } else {
                await flowDynamic('⚠️ No se encontró personal con el distribuidor especificado. Recuerda que se distingue entre mayúsculas y minúsculas.\n\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
              }
            } else {
              await flowDynamic('⚠️ No se encontró personal con el email especificado. Recuerda que se distingue entre mayúsculas y minúsculas\n\n¿Deseas realizar algo más?🤔\n✅ Escribe MENÚ para regresar al inicio.\n');
              }
          }
        } catch (error) {
          console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
          console.error('Stack trace:', error.stack);
          await flowDynamic('Ocurrió un error al consultar los datos. Por favor, intenta más tarde.');
        }
    });
       
  const flowPrincipal_2 = addKeyword(['chatbot','Chatbot','chatbot ','Chatbot ','CHATBOT'])
    .addAnswer('👋  ¡Hola! Soy GHBot🤖,tu asistente virtual de *GROWTH HACKING*, ¿En que puedo ayudarte?')
    .addAnswer([
     '1️⃣ *Registrar* un usuario ✍️ ',
     '2️⃣ *Consultar* información 📋',
     '3️⃣ Dar de *Baja* un usuario 🛑',
     '4️⃣ *Reactivar* un usuario  🔄 ',
     '5️⃣ *Mostrar* equipo de trabajo 🧑‍💼\n\nPor favor, responde que opción es la que deseas.',
    
    ],    null, null,[ flowRegistrarUsuario,flowConsulta,flowBaja,flowReactivar,flowMostrar])
  
  const flowPrincipal = addKeyword([
    'HOLA', 'hola', 'Hola',
    'MENU', 'menu', 'Menu', 'Menú', 'menú'
])
    .addAnswer('👋 ¡Hola! Soy GHBot 🤖, tu asistente virtual de *GROWTH HACKING*, ¿En qué puedo ayudarte?')
    .addAnswer([
        '1️⃣ *Registrar* un usuario ✍️ ',
        '2️⃣ *Consultar* información 📋',
        '3️⃣ Dar de *Baja* un usuario 🛑',
        '4️⃣ *Reactivar* un usuario 🔄 ',
        '5️⃣ *Mostrar* equipo de trabajo 🧑‍💼\n\nPor favor, responde con el número de la opción que deseas.',
    ])
    .addAction(async (ctx, { flowDynamic, endFlow,gotoFlow }) => {
        const userId = ctx.from;

        // Si el usuario ya tenía un timeout activo, lo limpiamos antes de crear uno nuevo
        if (activeUsers.has(userId)) {
            clearTimeout(activeUsers.get(userId));
        }

        // Creamos un timeout de 5 minutos (300000 ms)
        const timeout = setTimeout(async () => {
            //await flowDynamic('⏳✨ ¡Ayudarte es mi misión! 🤖 Cuando requieras ayuda nuevamente, solo escribe "Hola" y estaré listo para asistirte. 🚀 ¡Hasta pronto! 🙌');
            activeUsers.delete(userId); // Eliminamos al usuario del mapa cuando se notifica
            return gotoFlow(flowSalir);
        }, 300000);

        // Guardamos el timeout en el mapa
        activeUsers.set(userId, timeout);
    })
    .addAction({ capture: true }, async (ctx, { flowDynamic, gotoFlow,endFlow }) => {
        switch (ctx.body.trim().toLowerCase()) {
            case '1':
            case 'registrar':
                return gotoFlow(registerFlow);
            case '2':
            case 'consultar':
                return gotoFlow(flowConsulta);
            case '3':
            case 'baja':
                return gotoFlow(flowBaja);
            case '4':
            case 'reactivar':
                return gotoFlow(flowReactivar);
            case '5':
            case 'mostrar':
                return gotoFlow(flowMostrar);
            case 'hola':
                return gotoFlow(flowPrincipal);
            default:
                await flowDynamic('⚠️ Opción no válida. \n¿Deseas realizar algo más? 🤔\n\n ✅ Escribe *MENÚ* para regresar al inicio.');
        }
    });
   
    
  const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal,flowWelcome,registerFlow,flowPrincipal_2,flowSalir])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
      flow: adapterFlow,
      provider: adapterProvider,
      database: adapterDB,
    })
    QRPortalWeb()
  }

  main()

