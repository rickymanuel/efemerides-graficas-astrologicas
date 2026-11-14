import SwissEph from './src/swisseph.js';

const swe = new SwissEph();
let miGrafico = null;

const simbolosPlanetas = {
    'Sol': '☉', 'Mercurio': '☿', 'Venus': '♀', 'Marte': '♂', 
    'Júpiter': '♃', 'Saturno': '♄', 'Urano': '♅', 'Neptuno': '♆', 'Plutón': '♇'
};

function cortarSaltoDeCiclo(datos) {
    if (!datos || datos.length === 0) return datos;
    const resultado = [datos[0]];
    for (let i = 1; i < datos.length; i++) {
        if (datos[i - 1] === null || datos[i] === null) {
            resultado.push(datos[i]);
            continue;
        }
        let diff = datos[i] - datos[i - 1];
        if (diff > 180 || diff < -180) {
            resultado.push(null); 
            resultado.push(datos[i]); 
        } else {
            resultado.push(datos[i]); 
        }
    }
    return resultado;
}

const fondosPlugin = {
    id: 'fondosPlugin',
    beforeDatasetsDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;
        ctx.save();

        // Franjas horizontales (Signos)
        for (let i = 0; i < 12; i++) {
            const yInicio = y.getPixelForValue(i * 30);
            const yFin = y.getPixelForValue((i + 1) * 30);
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(255, 245, 157, 0.3)' : 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(left, yFin, right - left, yInicio - yFin);
        }

        // Franjas verticales (Meses/Años)
        const labels = chart.data.labels;
        const modo = chart.config.options.plugins.modoVistaActivo;
        
        for (let i = 0; i < labels.length; i++) {
            const xInicio = x.getPixelForValue(i);
            const xFin = (i < labels.length - 1) ? x.getPixelForValue(i + 1) : right;

            if (xInicio >= left && xInicio <= right) {
                let esPar = (modo === '6anios') ? (labels[i].anio % 2 === 0) : (labels[i].mes % 2 === 0);
                ctx.fillStyle = esPar ? 'rgba(240, 242, 245, 0.6)' : 'rgba(255, 255, 255, 0)';
                ctx.fillRect(xInicio, top, (xFin - xInicio), bottom - top);

                ctx.beginPath();
                ctx.moveTo(xInicio, top);
                ctx.lineTo(xInicio, bottom);
                ctx.lineWidth = 0.4;
                ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
                ctx.stroke();
            }
        }
        ctx.restore();
    },
    afterDraw(chart) {
        const { ctx, chartArea: { top }, scales: { x, y } } = chart;
        const labels = chart.data.labels;
        const modo = chart.config.options.plugins.modoVistaActivo;
        
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (modo === '6anios') {
            for (let i = 0; i < labels.length; i++) {
                if (labels[i].mes === 7) { 
                    ctx.fillText(labels[i].anio.toString(), x.getPixelForValue(i), top + 5); 
                }
            }
        } else {
            for (let i = 0; i < labels.length; i++) {
                if (i === 0 || labels[i].mes !== labels[i-1].mes) {
                    ctx.fillText(labels[i].mes.toString(), x.getPixelForValue(i) + 12, top + 5); 
                }
            }

            const asignacion = {
                'Plutón': 1, 'Neptuno': 3, 'Urano': 5, 'Saturno': 7,
                'Júpiter': 9, 'Marte': 11, 'Venus': 12, 'Mercurio': 2, 'Sol': 4
            };

            chart.data.datasets.forEach(dataset => {
                const mesObj = asignacion[dataset.label];
                if (!mesObj) return;

                let idx = -1;
                for (let i = 0; i < labels.length; i++) {
                    if (labels[i].mes === mesObj && (i === 0 || labels[i-1].mes !== mesObj)) {
                        idx = i;
                        break;
                    }
                }

                if (idx !== -1) {
                    const valY = dataset.data[idx];
                    if (valY !== null && valY !== undefined) {
                        const xPos = x.getPixelForValue(idx);
                        let valNorm = valY % 360;
                        if (valNorm < 0) valNorm += 360;
                        const yPos = y.getPixelForValue(valNorm);
                        
                        ctx.beginPath();
                        ctx.arc(xPos, yPos, 10, 0, 2 * Math.PI);
                        ctx.fillStyle = 'white'; 
                        ctx.fill();
                        ctx.lineWidth = 1.5;
                        ctx.strokeStyle = dataset.borderColor;
                        ctx.stroke();

                        ctx.fillStyle = dataset.borderColor; 
                        ctx.textBaseline = 'middle';
                        ctx.fillText(simbolosPlanetas[dataset.label], xPos, yPos + 1); 
                    }
                }
            });
        }
        ctx.restore();
    }
};

function llenarSelectorAnios() {
    const select = document.getElementById('anioInicio');
    select.innerHTML = '';
    const anioActual = new Date().getFullYear(); 

    for (let i = 1900; i <= 2100; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === anioActual) option.selected = true; 
        select.appendChild(option);
    }
}

async function iniciarApp() {
    llenarSelectorAnios();
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.textContent = "Inicializando...";

    try {
        await swe.initSwissEph();
        loading.style.display = 'none';
        generarGrafico();
    } catch (error) {
        console.error(error);
        loading.textContent = "Error al cargar.";
    }
}

function generarGrafico() {
    const anioInicio = parseInt(document.getElementById('anioInicio').value);
    const modoVista = document.getElementById('modoVista').value;
    const anioFin = modoVista === '6anios' ? anioInicio + 5 : anioInicio; 
    
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    loading.textContent = "Calculando...";

    setTimeout(() => {
        let planetas = [];
        
        // AQUÍ ESTÁN LOS COLORES CON LOS AJUSTES DE MERCURIO Y URANO
        if (modoVista === '6anios') {
            planetas = [
                { id: swe.SE_JUPITER, nombre: 'Júpiter', color: '#4D6BFE' }, // Azul DeepSeek
                { id: swe.SE_SATURN, nombre: 'Saturno', color: '#800080' },  // Púrpura oscuro
                { id: swe.SE_URANUS, nombre: 'Urano', color: '#1E8449' },    // Verde Esmeralda oscuro
                { id: swe.SE_NEPTUNE, nombre: 'Neptuno', color: '#8A2BE2' }, // Violeta
                { id: swe.SE_PLUTO, nombre: 'Plutón', color: '#000000' }     // Negro
            ];
        } else {
            planetas = [
                { id: swe.SE_SUN, nombre: 'Sol', color: '#f1c40f' },         // Amarillo
                { id: swe.SE_MERCURY, nombre: 'Mercurio', color: '#0A2540' },// Azul marino oscuro
                { id: swe.SE_VENUS, nombre: 'Venus', color: '#25D366' },     // Verde WhatsApp
                { id: swe.SE_MARS, nombre: 'Marte', color: '#FF4500' },      // Rojo Reddit
                { id: swe.SE_JUPITER, nombre: 'Júpiter', color: '#4D6BFE' }, // Azul DeepSeek
                { id: swe.SE_SATURN, nombre: 'Saturno', color: '#800080' },  // Púrpura oscuro
                { id: swe.SE_URANUS, nombre: 'Urano', color: '#1E8449' },    // Verde Esmeralda oscuro
                { id: swe.SE_NEPTUNE, nombre: 'Neptuno', color: '#8A2BE2' }, // Violeta
                { id: swe.SE_PLUTO, nombre: 'Plutón', color: '#000000' }     // Negro
            ];
        }

        let etiquetasTiempo = [];
        let datosGrafico = {};
        planetas.forEach(p => datosGrafico[p.nombre] = []);

        for (let anio = anioInicio; anio <= anioFin; anio++) {
            for (let mes = 1; mes <= 12; mes++) {
                let dias = (modoVista === '6anios') 
                    ? ((anio === anioFin && mes === 12) ? [15, 31] : [15])
                    : ((mes === 12) ? [1, 8, 15, 22, 31] : [1, 8, 15, 22]);
                
                for (let dia of dias) {
                    const jd = swe.julday(anio, mes, dia, 12.0); 
                    etiquetasTiempo.push({ mes: mes, anio: anio });

                    planetas.forEach(planeta => {
                        try {
                            const res = swe.calc_ut(jd, planeta.id, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);
                            datosGrafico[planeta.nombre].push(res[0]);
                        } catch (e) {
                            datosGrafico[planeta.nombre].push(null);
                        }
                    });
                }
            }
        }

        const ctx = document.getElementById('graficoAstral').getContext('2d');
        if (miGrafico) miGrafico.destroy();

        const datasets = planetas.map(p => ({
            label: p.nombre,
            data: cortarSaltoDeCiclo(datosGrafico[p.nombre]),
            borderColor: p.color,
            borderWidth: 2,
            fill: false,
            tension: 0.2,
            pointRadius: 0,
            spanGaps: false
        }));

        miGrafico = new Chart(ctx, {
            type: 'line',
            data: { labels: etiquetasTiempo, datasets: datasets },
            plugins: [fondosPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                clip: false, 
                layout: { padding: { right: 15, left: 5, top: 5, bottom: 5 } },
                plugins: {
                    modoVistaActivo: modoVista, 
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const idx = context[0].dataIndex;
                                const et = etiquetasTiempo[idx];
                                if (!et) return '';
                                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                                return `${meses[et.mes - 1]} ${et.anio}`;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    let grados = context.parsed.y % 360;
                                    if (grados < 0) grados += 360;
                                    const signos = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'];
                                    const signo = signos[Math.floor(grados / 30) % 12];
                                    label += `${(grados % 30).toFixed(2)}° de ${signo}`;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawOnChartArea: false, drawTicks: false },
                        ticks: { display: false }
                    },
                    y: {
                        min: 0,
                        max: 360, 
                        ticks: {
                            stepSize: 30,
                            color: '#888888',
                            callback: function(value) {
                                const signos = ['♈ Ari', '♉ Tau', '♊ Gem', '♋ Cán', '♌ Leo', '♍ Vir', '♎ Lib', '♏ Esc', '♐ Sag', '♑ Cap', '♒ Acu', '♓ Pis'];
                                let index = Math.floor(value / 30);
                                index = ((index % 12) + 12) % 12; 
                                return signos[index];
                            }
                        },
                        grid: {
                            color: function(context) {
                                return (context.tick.value % 30 === 0) ? 'rgba(180, 180, 180, 0.4)' : 'transparent';
                            },
                            lineWidth: 1
                        }
                    }
                }
            }
        });

        loading.style.display = 'none';
    }, 100); 
}

document.getElementById('btnGenerar').addEventListener('click', generarGrafico);
iniciarApp();