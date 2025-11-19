const TYPE_COLORS = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', steel: '#B7B7CE',
    dark: '#705746', fairy: '#D685AD'
};

const STAT_NAMES = {
    hp: 'HP', attack: 'Ataque', defense: 'Defensa',
    'special-attack': 'Ataque Especial', 'special-defense': 'Defensa Especial',
    speed: 'Velocidad'
};

const INITIAL_POKEBALL_URL = "https://upload.wikimedia.org/wikipedia/commons/5/53/Pok%C3%A9_Ball_icon.svg";


function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function getBackgroundStyle(types) {
    const colors = types.map(type => TYPE_COLORS[type.toLowerCase()]);

    if (colors.length === 1) {
        return colors[0];
    } else if (colors.length >= 2) {
        return `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`;
    }
    return 'white';
}

function resetCardContent() {
    document.getElementById("nombre").textContent = "nombre";
    document.getElementById("numero").textContent = "#número";
    document.getElementById("img").src = INITIAL_POKEBALL_URL;
    document.getElementById("altura").textContent = "Altura: m";
    document.getElementById("peso").textContent = "Peso: kg";
    document.getElementById("left-panel").style.background = '#ccc'; // Fondo neutro para la Pokébola
    document.body.style.backgroundColor = '#f0f0f0';
    document.getElementById("type-badges").innerHTML = '<div class="type-badge" style="background-color: #666;">???</div>';
    document.getElementById("weakness-badges").innerHTML = '<div class="type-badge" style="background-color: #666;">???</div>';
    document.getElementById("stats-list").innerHTML = '';
}

// --- CÁLCULO DE DEBILIDADES ---
async function getWeaknesses(types) {
    const typeUrls = types.map(type => `https://pokeapi.co/api/v2/type/${type}`);

    const typeResponses = await Promise.all(typeUrls.map(url => axios.get(url)));

    const damageMultipliers = {};

    typeResponses.forEach(res => {
        const relations = res.data.damage_relations;

        // Tipos contra los que es DEBIL (daño x2)
        relations.double_damage_from.forEach(damageType => {
            const typeName = damageType.name;
            damageMultipliers[typeName] = (damageMultipliers[typeName] || 1) * 2;
        });

        // Tipos contra los que es RESISTENTE (daño x0.5)
        relations.half_damage_from.forEach(damageType => {
            const typeName = damageType.name;
            damageMultipliers[typeName] = (damageMultipliers[typeName] || 1) * 0.5;
        });

        // Tipos contra los que es INMUNE (daño x0)
        relations.no_damage_from.forEach(damageType => {
            const typeName = damageType.name;
            damageMultipliers[typeName] = 0;
        });
    });

    // Retorna solo los tipos con un multiplicador de daño >= 2
    return Object.keys(damageMultipliers).filter(type => damageMultipliers[type] >= 2);
}

// --- FUNCIÓN PRINCIPAL DE BÚSQUEDA ---
async function traer() {
    const pokemonInput = document.getElementById("pok").value.toLowerCase().trim();
    const cardContainer = document.getElementById("card-container");
    const messageElement = document.getElementById("message");
    const weaknessBadgesContainer = document.getElementById("weakness-badges");
    const typeBadgesContainer = document.getElementById("type-badges");
    const statsList = document.getElementById("stats-list");

    // Ocultar y empezar la animación de salida
    cardContainer.classList.remove('visible');
    messageElement.classList.add('hidden');

    // Esperar un poco para que se vea la animación de salida antes de resetear
    await new Promise(resolve => setTimeout(resolve, 300));
    resetCardContent(); // Resetear el contenido a '???' o vacío

    messageElement.classList.remove('hidden');
    messageElement.textContent = 'Buscando Pokémon...';
    weaknessBadgesContainer.innerHTML = '';
    typeBadgesContainer.innerHTML = '';
    statsList.innerHTML = '';

    if (!pokemonInput) {
        messageElement.textContent = 'Por favor, escriba el nombre o número de un Pokémon.';
        return;
    }

    try {
        // 1. Obtener datos del Pokémon
        const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonInput}`);
        const data = res.data;

        const id = data.id.toString().padStart(3, '0');
        const types = data.types.map(t => t.type.name);

        // 2. Obtener Debilidades Correctas
        const weaknesses = await getWeaknesses(types);

        // 3. Actualizar Info General
        document.getElementById("nombre").textContent = capitalize(data.name);
        document.getElementById("numero").textContent = `#${id}`;
        document.getElementById("img").src = data.sprites.other["official-artwork"]["front_default"];
        document.getElementById("altura").textContent = `Altura: ${(data.height / 10).toFixed(1)}m`;
        document.getElementById("peso").textContent = `Peso: ${(data.weight / 10).toFixed(1)}kg`;

        // 4. Aplicar Estilos (Fondo y Degradado)
        const primaryType = types[0];
        const backgroundStyle = getBackgroundStyle(types); // OBTENER ESTILO PARA PANEL Y BARRAS
        document.getElementById("left-panel").style.background = backgroundStyle; // Aplicar a left-panel
        document.body.style.backgroundColor = primaryType ? TYPE_COLORS[primaryType] + 'aa' : '#f0f0f0';

        // 5. Generar Tipos
        types.forEach(type => {
            const badge = document.createElement('div');
            badge.className = 'type-badge';
            badge.textContent = capitalize(type);
            badge.style.backgroundColor = TYPE_COLORS[type];
            typeBadgesContainer.appendChild(badge);
        });

        // 6. Generar Badges de Debilidades
        if (weaknesses.length > 0) {
            weaknesses.forEach(weakness => {
                const badge = document.createElement('div');
                badge.className = 'type-badge';
                badge.textContent = capitalize(weakness);
                badge.style.backgroundColor = TYPE_COLORS[weakness] || '#666';
                weaknessBadgesContainer.appendChild(badge);
            });
        } else {
            weaknessBadgesContainer.textContent = 'No tiene debilidades destacadas (Daño x1 o menor).';
        }

        // 7. Generar Estadísticas
        const MAX_STAT_VALUE = 255;
        data.stats.forEach(stat => {
            const name = STAT_NAMES[stat.stat.name] || capitalize(stat.stat.name);
            const value = stat.base_stat;
            const percentage = (value / MAX_STAT_VALUE) * 100;

            const listItem = document.createElement('li');
            listItem.className = 'stat-item';

            listItem.innerHTML = `
                <div class="stat-name">${name}: ${value}/${MAX_STAT_VALUE}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar" style="width: ${percentage > 100 ? 100 : percentage}%; background: ${backgroundStyle};"></div>
                    </div>
            `;
            statsList.appendChild(listItem);
        });

        // 8. Mostrar la Tarjeta
        messageElement.classList.add('hidden');
        cardContainer.classList.remove('hidden');
        cardContainer.classList.add('visible'); // Activa la animación de entrada

    } catch (error) {
        console.error("Error fetching Pokémon data:", error);
        cardContainer.classList.add('hidden');
        messageElement.classList.remove('hidden');
        messageElement.textContent = `Pokémon "${pokemonInput}" no encontrado. Intente con otro nombre o número.`;
        resetCardContent();
    }
}

// Ejecutar la búsqueda inicial y configurar el estado inicial
document.addEventListener('DOMContentLoaded', () => {
    resetCardContent(); // Inicializa con '???' y Pokébola
    document.getElementById("card-container").classList.remove('hidden'); // Asegura que la tarjeta esté visible (aunque con contenido inicial)
    document.getElementById("card-container").classList.add('visible'); // Activa la animación inicial
    // Llamar a traer() aquí puede causar un error si el input está vacío. Se recomienda solo resetear.
    // traer(); // Comentado o eliminado para evitar búsqueda vacía al cargar
});



// --- CONFIGURACIÓN DEL EASTER EGG ---
const KONAMI_CODE = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba';
let konamiSequence = ''; // Almacena la secuencia de teclas presionadas
let isShinyModeActive = false;
const MAX_POKEMON_ID = 1025; // Número máximo de Pokémon en la PokeAPI
let currentPokemonId = 1; // Variable para almacenar el ID del Pokémon actualmente mostrado

// Elementos del DOM
const imgElement = document.getElementById('img');
const cardContainer = document.getElementById('card-container');
const body = document.body;
// Otros elementos que se necesitan actualizar
const typeBadgesContainer = document.getElementById("type-badges");
const weaknessBadgesContainer = document.getElementById("weakness-badges");
const statsList = document.getElementById("stats-list");

// Función auxiliar para obtener y actualizar todos los detalles del Pokémon
async function loadPokemonDetails(pokemonIdOrName, isShiny = false) {
    try {
        const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonIdOrName}`);
        const data = res.data;

        const id = data.id.toString().padStart(3, '0');
        const types = data.types.map(t => t.type.name);

        // 1. Obtener Debilidades Correctas
        const weaknesses = await getWeaknesses(types);

        // 2. Actualizar Info General
        document.getElementById("nombre").textContent = capitalize(data.name);
        document.getElementById("numero").textContent = `#${id}`;

        // Determinar la URL del sprite
        const spriteUrl = isShiny
            ? data.sprites.front_shiny
            : data.sprites.other["official-artwork"]["front_default"];
        document.getElementById("img").src = spriteUrl;

        // Aplicar estilos específicos del sprite (solo para shiny)
        if (isShiny) {
            // Este sprite es más pequeño y necesita un tamaño fijo
            imgElement.style.width = '475px'; // Ajusta el tamaño para el sprite shiny
            imgElement.style.height = 'auto';
        } else {
            // Vuelve al estilo del sprite oficial grande
            imgElement.style.width = '475px';
            imgElement.style.height = 'auto';
        }

        document.getElementById("altura").textContent = `Altura: ${(data.height / 10).toFixed(1)}m`;
        document.getElementById("peso").textContent = `Peso: ${(data.weight / 10).toFixed(1)}kg`;
        currentPokemonId = data.id; // Guarda el ID del Pokémon cargado

        // 3. Aplicar Estilos (Fondo y Degradado)
        const primaryType = types[0];
        const backgroundStyle = getBackgroundStyle(types); // OBTENER ESTILO PARA PANEL Y BARRAS
        document.getElementById("left-panel").style.background = backgroundStyle; // Aplicar a left-panel

        // El fondo del body cambia solo si NO es el modo shiny
        if (!isShiny) {
            document.body.style.backgroundColor = primaryType ? TYPE_COLORS[primaryType] + 'aa' : '#f0f0f0';
        }

        // 4. Generar Tipos
        typeBadgesContainer.innerHTML = ''; // Limpiar
        types.forEach(type => {
            const badge = document.createElement('div');
            badge.className = 'type-badge';
            badge.textContent = capitalize(type);
            badge.style.backgroundColor = TYPE_COLORS[type];
            typeBadgesContainer.appendChild(badge);
        });

        // 5. Generar Badges de Debilidades
        weaknessBadgesContainer.innerHTML = ''; // Limpiar
        if (weaknesses.length > 0) {
            weaknesses.forEach(weakness => {
                const badge = document.createElement('div');
                badge.className = 'type-badge';
                badge.textContent = capitalize(weakness);
                badge.style.backgroundColor = TYPE_COLORS[weakness] || '#666';
                weaknessBadgesContainer.appendChild(badge);
            });
        } else {
            weaknessBadgesContainer.textContent = 'No tiene debilidades destacadas (Daño x1 o menor).';
        }

        // 6. Generar Estadísticas
        statsList.innerHTML = ''; // Limpiar
        const MAX_STAT_VALUE = 255;
        data.stats.forEach(stat => {
            const name = STAT_NAMES[stat.stat.name] || capitalize(stat.stat.name);
            const value = stat.base_stat;
            const percentage = (value / MAX_STAT_VALUE) * 100;

            const listItem = document.createElement('li');
            listItem.className = 'stat-item';

            listItem.innerHTML = `
                <div class="stat-name">${name}: ${value}/${MAX_STAT_VALUE}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar" style="width: ${percentage > 100 ? 100 : percentage}%; background: ${backgroundStyle};"></div>
                    </div>
            `;
            statsList.appendChild(listItem);
        });

        // 7. Mostrar la Tarjeta
        document.getElementById("message").classList.add('hidden');
        cardContainer.classList.remove('hidden');
        cardContainer.classList.add('visible'); // Activa la animación de entrada

    } catch (error) {
        console.error("Error cargando detalles del Pokémon:", error);
        // Si falla la carga, volvemos a un estado de error o a resetCardContent
        resetCardContent();
        document.getElementById("message").classList.remove('hidden');
        document.getElementById("message").textContent = 'Error al cargar los datos del Pokémon.';
    }
}


// --- FUNCIÓN DE ACTIVACIÓN Y DESACTIVACIÓN ---
async function toggleShinyMode(activate) {
    if (activate) {
        // 1. Generar un Pokémon aleatorio
        const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;

        // 2. Cargar los detalles, especificando que es shiny
        await loadPokemonDetails(randomId, true);

        // 3. Aplicar estilos visuales del modo Shiny
        body.style.backgroundColor = '#555';
        cardContainer.style.boxShadow = '0 0 50px #ffff00'; // Destello amarillo/oro

        // 4. Activar la bandera
        isShinyModeActive = true;
        console.log(`🎉 Easter Egg activado! Pokémon Shiny ID: ${randomId}`);
    } else {
        // --- DESACTIVACIÓN ---

        // 1. Revertir estilos visuales
        body.style.backgroundColor = ''; // Vuelve al estilo CSS original (que se aplica al cargar el normal)
        cardContainer.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)'; // Vuelve a la sombra original

        // 2. Cargar el último Pokémon cargado en modo normal (no shiny)
        await loadPokemonDetails(currentPokemonId, false);

        // 3. Desactivar la bandera
        isShinyModeActive = false;

        console.log('Easter Egg desactivado. Volviendo al modo normal.');
    }
}


// --- ESCUCHA DEL TECLADO ---
document.addEventListener('keydown', (e) => {
    // 1. Ignorar si ya está activo
    if (isShinyModeActive) {
        // Si el usuario presiona ESC, desactiva el modo shiny
        if (e.key === 'Escape') {
            toggleShinyMode(false);
        }
        return;
    }

    // 2. Construir la secuencia
    konamiSequence += e.key;

    // 3. Recortar para evitar que la secuencia sea demasiado larga
    if (konamiSequence.length > KONAMI_CODE.length) {
        konamiSequence = konamiSequence.substring(konamiSequence.length - KONAMI_CODE.length);
    }

    // 4. Verificar la secuencia
    if (konamiSequence.endsWith(KONAMI_CODE)) {
        toggleShinyMode(true);
        // Reiniciar la secuencia para que no se active accidentalmente de nuevo
        konamiSequence = '';
    }
});

