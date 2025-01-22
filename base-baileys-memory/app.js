// Suggested code may be subject to a license. Learn more: ~LicenseLog:3591953618.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:2744116807.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:664549028.
// Suggested code may be subject to a license. Learn more: ~LicenseLog:702062939.
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const axios = require('axios')
const { reduceBinaryNodeToDictionary } = require('@whiskeysockets/baileys')
// Configuración de AppSheet
const APPSHEET_API_URL = 'https://api.appsheet.com/api/v2/apps/bccce12a-4469-46ea-9de3-d4a09ba4f316/tables/personal/Action'
const APPSHEET_API_KEY = 'V2-LGQA6-8OWxX-m3j9Z-IvSUD-COZrU-AlrCf-O0doo-jv8yA'
const APPSHEET_API_URL_GERENCIAS = 'https://api.appsheet.com/api/v2/apps/bccce12a-4469-46ea-9de3-d4a09ba4f316/tables/gerencias/Action'; // URL para leer datos

const flowWeb = addKeyword(['web'])
  .addAnswer('Esta es nuestra página web: www.empresa.com')

const flowRegistrarUsuario = addKeyword(['1','registrar','registro','registra','Registrar'])
  .addAnswer('¡Hola! 👋 Vamos a registrar un usuario en la app de Citas. Por favor, sigue las instrucciones.   ')
  .addAnswer('¿Te parece si empezamos, cual es el nombre completo? ✍️ ', { capture: true }, async (ctx, { flowDynamic, state }) => {
    const nombreUsuario = ctx.body
    await state.update({ nombreUsuario: nombreUsuario })
    //await flowDynamic(`*Usuario*: ${nombreUsuario}. Ahora, `)
  })
  .addAnswer('¡Muy bien!,  😄 Ahora necesito el correo electrónico 📧 ', { capture: true }, async (ctx, { flowDynamic, state }) => {
    const emailUsuario = ctx.body
    await state.update({ emailUsuario: emailUsuario })
    //await flowDynamic(`Email: ${emailUsuario}. Ahora, `)
  })
  .addAnswer('¡Perfecto! 🎉 ¿Cuál es el número de celular? 📱', { capture: true }, async (ctx, { flowDynamic, state }) => {
    const celUsuario = ctx.body
    await state.update({ celUsuario: celUsuario })
    //await flowDynamic(`celular: ${celUsuario}. Por ultimo, `)
  })
  .addAnswer('¡Gracias! Ahora, para finalizar, ¿puedes decirme el numero del distribuidor con quien trabaja? 🤝', { capture: true }, async (ctx, { flowDynamic, state }) => {
    const distribucionUsuario = ctx.body

    const numeroCelular = ctx.key.remoteJid.split('@')[0]; // El número de teléfono se encuentra antes de "@s.whatsapp.net"
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
                                "Email": emailUsuario,
                                "Gerente": distribucionNombre,
                                "IdGerente": distribucionId,
                                "Telefono": celUsuario,
                                "Puesto": "EMPRENDEDOR",
                                "Turno": "Mixto",
                                "Rol": "CAMPO",
                                "Nick": numeroCelular,
                                "Checa":false,
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
                  await flowDynamic('🔴 Número de Distribuidor no Existe.\n¿Deseas realizar algo más? 🤔\n ✅ Escribe *MENÚ* para regresar al inicio.');
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

  const flowConsulta = addKeyword(['2','consulta','Consulta','consultar'	])
    .addAnswer('Hola! 👋 Vamos a consultar su informacion registrada. Por favor, sigue las instrucciones.')
    .addAnswer('¿Cuál es su Email registrado? ✍️', { capture: true }, async (ctx, { flowDynamic, state }) => {
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
                        }
                    });
                    await flowDynamic(personalMsg);
                } else {
                    await flowDynamic('No se encontro personal con el email especificado.');
                }
            } else {
                await flowDynamic('No se encontro personal con el email especificado.');
            }
        } catch (error) {
            console.error('Error al consultar los datos:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
            console.error('Stack trace:', error.stack);
            await flowDynamic('Ocurrió un error al consultar los datos. Por favor, intenta más tarde.');
        }
    });

  const flowBaja = addKeyword(['3','baja','Baja'])
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

    const flowReactivar = addKeyword(['4',' Reactivar','reactivar'])
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
       
const flowPrincipal = addKeyword(['chatbot','Chatbot','chatbot ','Chatbot ','CHATBOT','MENU','menu','Menu','Menú','menú'])
  .addAnswer('👋  ¡Hola! Soy tu asistente virtual de soporte de la App de Citas de *GROWTH HACKING*, ¿En que puedo ayudarte?')
  .addAnswer([
    '1️⃣ *Registrar* un usuario ✍️ ',
    '2️⃣ *Consultar* información 📋',
    '3️⃣ *Dar de baja* un usuario 🛑',
    '4️⃣ *Reactivar* un usuario  🔄 ',
    '5️⃣ *Mostrar* equipo de trabajo 🧑‍💼\n\n Por favor, responde que opción es la que deseas.',
    
  ], null, null, [ flowRegistrarUsuario,flowConsulta,flowBaja,flowReactivar])
const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = createFlow([flowPrincipal])
  const adapterProvider = createProvider(BaileysProvider)
  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })
  QRPortalWeb()
}
main()

