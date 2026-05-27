# 💡 Feature ideas — backlog exploratorio

Snapshot: 26 mayo 2026.

Features **nuevas** que no están en [`feature-status.md`](./feature-status.md) ni en "Ideas largo plazo" de [`roadmap.md`](./roadmap.md). Acá viven hipótesis. No están priorizadas — son combustible para futuras decisiones.

## Cómo leer

| Esfuerzo | Significado |
|---|---|
| 🟢 | Chico — media tarde a 1 día |
| 🟡 | Medio — 1-2 sprints |
| 🔴 | Grande — sprint completo o más |

| Apuesta | Significado |
|---|---|
| ⭐⭐⭐ | Alto potencial de mover la aguja |
| ⭐⭐ | Mejora notable de engagement / producto |
| ⭐ | Nicho, pulido, o long-shot |

---

## 🔁 Engagement & retención

### F-01 · Combo streak multiplier ⭐⭐⭐ 🟡
Reclamar misiones X días seguidos sin fallar activa un multiplicador en el próximo sobre (más cromos, mejor rareza esperada). Resetea si se rompe la racha.

**Por qué**: refuerza el daily habit más allá del streak actual, agrega tensión de "no la rompo".
**Encaja con**: `streaks`, `user_missions`, `open_pack` RPC.

### F-02 · Calendario de recompensas mensual ⭐⭐ 🟡
Login calendar 1-30: cada día reclamado entrega un reward escalable (día 1: 5 coins, día 7: 1 sobre extra, día 30: cromo garantizado rare+). Resetea cada mes.

**Por qué**: patrón clásico de mobile games. Comprobado para frecuencia.
**Encaja con**: nuevo widget en home, tabla `user_login_calendar`.

### F-03 · Sobre de medianoche automático ⭐⭐ 🟡
Si el usuario no abrió su sobre del día, a las 00:00 local se le marca "pendiente para mañana" en vez de perderlo, hasta 1 acumulado.

**Por qué**: baja el "perdí un día → me bajo" effect en casual users.
**Encaja con**: `claim_daily_pack` RPC + cron.

### F-04 · Páginas a 1 cromo de completar como push ⭐⭐ 🟢
Notificación push web (cuando esté el setup): "Te falta 1 cromo para completar la página 5".

**Por qué**: re-engage. Aprovecha "estás tan cerca" psicología.
**Encaja con**: query existente de `pageCompletion`, web push.

### F-05 · Spotlight diario ⭐⭐ 🟡
Cada día una página específica del álbum es "destacada". Completarla hoy entrega bonus (coins + sobre temático).

**Por qué**: dirige tráfico a partes del producto, descubre cromos olvidados.
**Encaja con**: tabla `daily_spotlight`, query del álbum, misiones.

### F-06 · Pity system para legendarios ⭐⭐ 🟡
Después de N sobres sin legendary, el N+1 lo garantiza. Counter visible: "Próximo legendary garantizado en 4 sobres".

**Por qué**: protege contra runs de mala suerte que generan churn. Estándar gacha.
**Encaja con**: `open_pack` RPC, tabla `user_pity_counters`, UI home.

### F-07 · "Tu cromo más raro vale X coins" ⭐ 🟢
Card en perfil/home que muestra el cromo más raro que tenés con su valor de dismantle. Pequeña vanidad metric.

**Por qué**: micro-dopamina, fácil de compartir.
**Encaja con**: queries de profile, lógica dismantle.

---

## 🌐 Social & viralidad

### F-08 · Referrals con recompensa ⭐⭐⭐ 🟡
Link `/invite/[code]` único por usuario. Si alguien se registra usándolo, owner gana 1 sobre, nuevo gana starter pack acelerado.

**Por qué**: vector orgánico de growth. Ya hay misión `referral_count` vacía esperando.
**Encaja con**: auth flow, tabla `referral_codes`, missions.

### F-09 · Compará álbumes con un amigo ⭐⭐⭐ 🟡
Vista `/u/[username]?vs=otroUsuario`: side-by-side de álbumes, highlight "vos lo tenés y otro no" y vice versa.

**Por qué**: monetiza la curiosidad social. Activa el "che, ya me ganaste" del Mundial.
**Encaja con**: profile, user_cards, public pages.

### F-10 · Reacciones emoji en cromos pineados de otros ⭐⭐ 🟡
En `/cromo/[cardId]?u=...` cualquier visitante puede dejar emojis (🔥, 👑, 😍, etc.) con contador. El owner ve "Tu Messi tiene 47 🔥".

**Por qué**: ligera-interacción sin abrir Pandora de comentarios. Validates rarity desire.
**Encaja con**: nueva tabla `card_reactions`, public card page, profile.

### F-11 · Compartir screenshot del álbum ⭐⭐ 🟢
Botón en `/album` genera imagen PNG con estado actual de la página y caption pre-armado ("Voy por la página 5 · 47/205"). Comparte a WhatsApp/Twitter/Stories.

**Por qué**: más viral que compartir 1 cromo. Muestra progreso.
**Encaja con**: nuevo endpoint `/api/og/album/[username]/[page]` o `html2canvas`.

### F-12 · Tier lists públicas ⭐ 🔴
Cualquier usuario puede armar su tier list (S/A/B/C/D) drag&drop con los 205 cromos. Se publica en `/u/[username]/tier-list`. Otros usuarios votan.

**Por qué**: contenido generado por usuarios. Discurso comunitario.
**Encaja con**: nueva tabla `tier_lists`, profile, voting.

### F-13 · "Cromos firmados" entregados desde la cuenta oficial ⭐ 🟢
Cromiks team puede mandarle a un usuario destacado un cromo marcado con flag `is_signed = true`. Visualmente distinto (firma overlay). No transferible.

**Por qué**: ritual / capricho. Premia community managers, ganadores de concursos, prensa.
**Encaja con**: admin tool básico, flag en user_cards.

---

## 🎴 Coleccionismo profundo

### F-14 · Variantes especiales (gold/holo/foil) ⭐⭐⭐ 🟡
Cada cromo puede aparecer en variante normal o foil ultra-rara (1%). Visualmente diferente (shimmer 3D). Se trackea como `card_id + variant`. Album puede mostrar "tenés base + foil".

**Por qué**: profundidad de colección sin agregar más cromos. Hype mecanism.
**Encaja con**: schema `user_cards.variant`, open_pack RPC, cromo component visual, álbum.

### F-15 · Sobre temático al completar un país/grupo ⭐⭐ 🟡
Completar todos los cromos de Argentina te entrega un sobre especial "Selección" con cromos exclusivos (poses alternativas, momentos icónicos del Mundial).

**Por qué**: micro-meta-goals dentro del álbum. Recompensa completionists.
**Encaja con**: schema pages/categories, open_pack RPC, set completion logic.

### F-16 · Set completion rewards ⭐⭐ 🟡
Tener los 5 comunes de un equipo entrega 10 coins. Tener los 11 legendarios entrega cromo único "Campeón". Visible como progreso en perfil.

**Por qué**: dirige al usuario hacia metas concretas, no solo "205".
**Encaja con**: queries de progreso, claim RPC, achievements.

### F-17 · Calidad/condición del cromo (grade) ⭐ 🟡
Cada copia rolleada viene con un grade aleatorio 60-100%. Legendaries con grade 100% son "joyas". Visible en card detail.

**Por qué**: agrega depth y razón para rerollear cards repetidas.
**Encaja con**: `user_cards.grade`, open_pack RPC, card detail visual.

### F-18 · Cromos perdidos / cromos lost media ⭐⭐ 🟡
1-2 cromos secretos que **no** salen en sobres normales. Solo se desbloquean por triggers raros (compartir 100 veces, abrir sobre 1000, evento aniversario).

**Por qué**: leyenda urbana. Hype. Reddit posts.
**Encaja con**: cards con flag `secret_unlock_condition`, trigger SQL.

---

## 📖 Storytelling & contenido

### F-19 · Timeline cronológico del Mundial ⭐⭐⭐ 🟡
Vista `/timeline`: línea de tiempo del Mundial 2022 día por día. Cada hito (partido, gol icónico, definición) linkea al cromo asociado. "Hoy hace 4 años: gol de Messi a Países Bajos".

**Por qué**: aprovecha el "Eterno Diciembre" vibe que la docs marca como product vision. Convierte el álbum en un objeto narrativo, no solo colección.
**Encaja con**: nueva tabla `timeline_events`, cards con `event_id`, route public.

### F-20 · Mini-historia narrada por audio en cromos legendary ⭐⭐⭐ 🔴
Los 11 legendarios tienen un audio clip (30-60s, voz humana o TTS calidad) contando el momento. Reproducible en card detail. Subtítulos sincronizados.

**Por qué**: emocionalmente lo más fuerte que puede tener el producto. Diferencial real vs álbumes físicos.
**Encaja con**: storage de audios, `cards.audio_url`, player en card detail, pack opening (auto-play en legendary reveal).

### F-21 · "Where were you?" ⭐⭐ 🟡
En cromos icónicos (gol del Dibu, gol Messi final), prompt al primer view: "¿Dónde estabas el 18/12/22?". Respuesta queda en perfil del usuario y visible en el cromo público como historias agregadas.

**Por qué**: nostalgia colectiva. La frase del título es viral.
**Encaja con**: tabla `card_memories`, perfil, public card page.

### F-22 · Highlight de video embebido en legendarios ⭐⭐ 🟢
Card detail de legendary tiene botón "Ver gol" que abre embed de YouTube oficial. No hace falta hostear video.

**Por qué**: contenido sin costo de creación. Drives watch time externo.
**Encaja con**: `cards.highlight_url`, card detail UI.

### F-23 · Trivia diaria ⭐⭐ 🟡
Modal con pregunta del día sobre el Mundial. Acertar entrega 5 coins. Compartible: "¿Sabías que...? + caption".

**Por qué**: contenido evergreen, ritual, shareable.
**Encaja con**: tabla `trivia_facts`, daily widget, sharing.

### F-24 · Subí tu foto del 18/12 al álbum ⭐⭐ 🟡
Sección personal "Mis recuerdos": el usuario sube fotos suyas del Mundial (la fiesta, el partido, la final). Adjuntas a cromos específicos. Privadas por default.

**Por qué**: app se vuelve archivo personal. Sticky factor enorme.
**Encaja con**: storage, `user_memories` table, perfil.

---

## 🎨 Personalización

### F-25 · Temas visuales del álbum ⭐⭐ 🟡
Skins del shell: clásico (actual), banderín argentino, Eterno Diciembre (vintage), futurista. Unlock por progreso o coins.

**Por qué**: self-expression sin tocar gameplay. Acá la gente paga.
**Encaja con**: design system, `user_preferences.theme`, unlocks.

### F-26 · Notas personales en cada cromo ⭐ 🟢
Campo de texto privado en card detail: "Mi viejo lloró cuando salió este". Visible solo al owner.

**Por qué**: emotional attachment hipper. Casi-diary.
**Encaja con**: `user_cards.private_note`.

### F-27 · Dedicar un cromo a alguien ⭐ 🟢
"Dedicado a mi viejo, Daniel" aparece como overlay en el card detail. Compartible.

**Por qué**: peso emocional. Triggers cry-share.
**Encaja con**: `user_cards.dedicated_to`, sharing.

### F-28 · Skins del sobre 3D ⭐⭐ 🟡
Después de X sobres abiertos o al completar sets, se desbloquean texturas alternativas del sobre (gold, retro, banderín). Visibles antes de abrir.

**Por qué**: rewards visuales sin tocar economy. Ya tenemos infra 3D.
**Encaja con**: GLTF + textures variant, `user_preferences.pack_skin`, pack-opening flow.

### F-29 · Reordenar las páginas del álbum ⭐ 🟢
Drag-to-reorder. Cada usuario puede armar su narrativa. La página 1 siempre puede ser la de los legendarios si querés.

**Por qué**: dominio del objeto. Single moment of agency.
**Encaja con**: `user_album_layout`, album page.

---

## 🎮 Mecánicas de juego

### F-30 · Predicción del próximo legendary ⭐ 🟡
"¿Cuál creés que va a salir?" — el usuario apuesta su próximo legendary. Si acierta, 50 coins bonus.

**Por qué**: agrega tensión a los sobres. Genera teorías comunitarias.
**Encaja con**: tabla `predictions`, open_pack RPC verificar match.

### F-31 · Spin de la rueda semanal ⭐⭐ 🟡
Una vez por semana podés spinear: premios entre 5 coins y un legendary garantizado. Gratis.

**Por qué**: feature de retención clásica. Algo distinto al daily pack.
**Encaja con**: nueva RPC, UI standalone, tabla `weekly_spins`.

### F-32 · Sobres temáticos comprables con coins ⭐⭐⭐ 🟡
Ya hay coins (de dismantle + misiones) pero no hay dónde gastarlos. Sobres temáticos: "Sobre delanteros" / "Sobre defensa" / "Sobre rare+ garantizado" cuestan 20-100 coins.

**Por qué**: cerrar el loop económico. Coins necesitan sink.
**Encaja con**: `pack_types` table, store UI, open_pack RPC con filter.

### F-33 · Cromo regalado a un amigo ⭐⭐ 🟡
Tenés 4 duplicados de Messi → podés regalarle 1 a un amigo registrado. Cuenta como misión "compartiste".

**Por qué**: social acto generoso. Diferencia del trading (no necesita reciprocidad).
**Encaja con**: nueva action `giftCard`, `user_cards`, missions.

---

## 👥 Comunidad

### F-34 · Muro público de mensajes en cromos legendary ⭐⭐ 🔴
Cada cromo legendary tiene un muro público donde los usuarios dejan mensajes (140 chars, moderado). "Lloré cuando lo gritaba mi viejo". Visible en `/cromo/[cardId]`.

**Por qué**: archivo emocional colectivo. Único en su tipo.
**Encaja con**: nueva tabla `card_messages` con moderation, public card page.

### F-35 · Hinchada por equipo de origen ⭐ 🟡
Onboarding pregunta "¿de qué club sos?". Crea sub-comunidad por equipo. Leaderboard "Boca tiene 234 colectores", "River 215".

**Por qué**: identidad. Argentina vive de esto.
**Encaja con**: `profiles.club`, agregación, leaderboard page.

### F-36 · Discord bot que postea progreso ⭐ 🟡
Comando `/cromiks-status @user`: el bot postea card con progreso del usuario. Sirve para canales de coleccionistas.

**Por qué**: extensión donde la conversación ya pasa.
**Encaja con**: API pública, Discord.js bot host.

---

## 💰 Monetización opcional (no-P2W)

### F-37 · Pase mensual de suscripción ⭐⭐⭐ 🔴
$3 USD/mes: +1 sobre diario, cosmetics exclusivos, skip de animaciones, sobres temáticos baratos. **Cero advantage competitivo** sobre cromos.

**Por qué**: revenue sustainable. Tip jar ya es señal.
**Encaja con**: Mercado Pago recurring, `subscriptions` table.

### F-38 · Tienda de cosmetics rotativa ⭐⭐ 🔴
Mensual: skin de sobre + borde de cromo + tema de álbum. Cuestan coins o pesos. Solo cosméticos.

**Por qué**: monetiza self-expression sin afectar gameplay.
**Encaja con**: F-25, F-28, payment infra.

### F-39 · Cromos firmados pagos (NO-IP cuidado) ⭐ 🔴
Si conseguimos rights de algún jugador real, "cromo firmado" comprable como NFT-like (sin blockchain, simple flag). Volverlo evento, no permanente.

**Por qué**: revenue + hype controlado.
**Encaja con**: requiere legal + acuerdos. Para post-launch.

---

## 📊 Métricas para el usuario

### F-40 · Stats deep-dive en perfil ⭐⭐ 🟡
`/u/[username]/stats`: histograma de aperturas por día, gráfico de rareza obtenida, mejor día, sesión más larga, etc.

**Por qué**: data-as-content. Strava effect.
**Encaja con**: aggregations, charts, profile.

### F-41 · "Tu Wrapped Cromiks" ⭐⭐⭐ 🟡
Una vez al año (o cada 6 meses), pantalla tipo Spotify Wrapped resumiendo: cromos sumados, racha más larga, momento favorito, top legendary. Shareable como image carousel.

**Por qué**: super-shareable. Aniversario natural.
**Encaja con**: aggregations, OG image generator.

### F-42 · "Estás en el top X%" ⭐ 🟢
Card en perfil: "Estás en el top 12% de colectores".

**Por qué**: status. Vanidad relativa.
**Encaja con**: percentile query, profile widget.

### F-43 · Heatmap público de qué cromo le falta a la gente ⭐ 🟡
Mapa de calor: qué cromos posee % de la base. Identifica los más esquivos.

**Por qué**: transparency + meta-game. Genera teorías.
**Encaja con**: aggregation, public stats page.

---

## ♿ Accesibilidad e inclusión

### F-44 · Modo bajo-data (sin 3D) ⭐⭐ 🟡
Toggle en settings: reemplaza el pack opening 3D por una versión 2D (cards aparecen en cascada). Más rápido en 3G/devices viejos.

**Por qué**: target Argentina incluye conexiones flojas y celulares baratos.
**Encaja con**: `user_preferences.low_data`, alternativa 2D del pack-opening flow.

### F-45 · Modo daltónico ⭐ 🟢
Patrones SVG además de colores en tier badges. Toggle en settings.

**Por qué**: WCAG + ~8% de target. Cheap fix.
**Encaja con**: design system, cromo component, prefs.

### F-46 · Alt text descriptivo para screen readers ⭐ 🟢
"Cromo común, arquero argentino, Emiliano Martínez, Aston Villa".

**Por qué**: inclusión real. Pegada de imagen sin esfuerzo.
**Encaja con**: card components.

### F-47 · Modo nostalgia (texto más grande) ⭐ 🟢
Modo opcional para audiencia +50 (target tiene +25): UI con tipografía 18-20px base, controles más grandes.

**Por qué**: el target ya es adulto. Va a haber gente grande.
**Encaja con**: theme system.

---

## 🔗 Integraciones

### F-48 · Spotify "Banda sonora del álbum" ⭐⭐ 🟡
Playlist colaborativa: el usuario asocia un track con su cromo favorito → la playlist personal se actualiza. Compartible.

**Por qué**: contenido cruzado emocional. Spotify es Argentina-fuerte.
**Encaja con**: Spotify Web API, profile, card detail.

### F-49 · Recordatorio en calendario ⭐ 🟢
Botón "Sumar a Google Calendar" — crea evento recurrente diario "Abrir sobre Cromiks 9am".

**Por qué**: habit formation. Friction baja.
**Encaja con**: Google Calendar API link generation (sin OAuth necesario).

### F-50 · "Mi perfil PDF" descargable ⭐ 🟢
Genera tarjeta personal (PDF/PNG) con username, QR a `/u/[username]`, stats. Imprimible.

**Por qué**: nostalgia, viralidad offline.
**Encaja con**: `@react-pdf`, profile data.

---

## 📅 Eventos en vivo / aniversarios

### F-51 · Modo aniversario el 18/12 ⭐⭐⭐ 🟡
El 18 de diciembre (aniversario de la final) el app entra en modo evento: todos los usuarios reciben un sobre especial, animación distinta en home, sound design del partido en background. Cosmético gratis "Día 18/12 2026".

**Por qué**: tiembla el alma. Marketing automático.
**Encaja con**: cron, `events` table, theming dinámico.

### F-52 · Cronología paralela ⭐⭐ 🟡
Durante junio 2026, replicar día por día el Mundial 2022: el día que se jugó Argentina-Polonia entrega un sobre temático ese día.

**Por qué**: revivir la experiencia en tiempo real. Engagement diario garantizado por 1 mes.
**Encaja con**: cron + tabla `dated_events`.

### F-53 · Watch-along con clip embebido ⭐ 🟡
El día de un aniversario de partido, botón "Ver el resumen ahora" abre el highlight + sincroniza con cromos relacionados.

**Por qué**: contenido edge para fechas clave.
**Encaja con**: F-22 + F-52.

---

## 🤖 Inteligente / ML-ligero

### F-54 · Recomendación de cromo a pinear ⭐ 🟢
Sugiere cuál de tus owned pinear basado en rareza, popularidad de visitas a tu perfil, recency.

**Por qué**: lower-friction defaults. Mejor profile-first time.
**Encaja con**: heurística simple (no ML), profile.

### F-55 · "Tu próximo pack probablemente trae" ⭐ 🟢
Stats teasing: "Tu próximo sobre probablemente tenga 1 rare". Calculado del weight + tu historia.

**Por qué**: anticipation builder. Pseudo-magic.
**Encaja con**: query de stats personales, home widget.

---

## Tabla resumen rápida

| ID | Categoría | Apuesta | Esfuerzo |
|---|---|---|---|
| F-01 Combo streak multiplier | Engagement | ⭐⭐⭐ | 🟡 |
| F-02 Calendario mensual rewards | Engagement | ⭐⭐ | 🟡 |
| F-03 Sobre de medianoche auto | Engagement | ⭐⭐ | 🟡 |
| F-04 Push "página a 1 cromo" | Engagement | ⭐⭐ | 🟢 |
| F-05 Spotlight diario | Engagement | ⭐⭐ | 🟡 |
| F-06 Pity system legendaries | Engagement | ⭐⭐ | 🟡 |
| F-07 Tu cromo más raro vale X | Engagement | ⭐ | 🟢 |
| F-08 Referrals con reward | Social | ⭐⭐⭐ | 🟡 |
| F-09 Comparar álbumes con amigo | Social | ⭐⭐⭐ | 🟡 |
| F-10 Reacciones emoji en cromos | Social | ⭐⭐ | 🟡 |
| F-11 Screenshot del álbum | Social | ⭐⭐ | 🟢 |
| F-12 Tier lists públicas | Social | ⭐ | 🔴 |
| F-13 Cromos firmados oficiales | Social | ⭐ | 🟢 |
| F-14 Variantes foil/holo | Colección | ⭐⭐⭐ | 🟡 |
| F-15 Sobre temático por país | Colección | ⭐⭐ | 🟡 |
| F-16 Set completion rewards | Colección | ⭐⭐ | 🟡 |
| F-17 Grade del cromo | Colección | ⭐ | 🟡 |
| F-18 Cromos perdidos / lost media | Colección | ⭐⭐ | 🟡 |
| F-19 Timeline del Mundial | Storytelling | ⭐⭐⭐ | 🟡 |
| F-20 Audio narrado legendarios | Storytelling | ⭐⭐⭐ | 🔴 |
| F-21 Where were you? | Storytelling | ⭐⭐ | 🟡 |
| F-22 Video highlight legendarios | Storytelling | ⭐⭐ | 🟢 |
| F-23 Trivia diaria | Storytelling | ⭐⭐ | 🟡 |
| F-24 Subí tu foto del 18/12 | Storytelling | ⭐⭐ | 🟡 |
| F-25 Temas visuales del álbum | Personalización | ⭐⭐ | 🟡 |
| F-26 Notas privadas en cromos | Personalización | ⭐ | 🟢 |
| F-27 Dedicar cromo a alguien | Personalización | ⭐ | 🟢 |
| F-28 Skins del sobre 3D | Personalización | ⭐⭐ | 🟡 |
| F-29 Reordenar páginas del álbum | Personalización | ⭐ | 🟢 |
| F-30 Predecir próximo legendary | Mecánica | ⭐ | 🟡 |
| F-31 Spin semanal de la rueda | Mecánica | ⭐⭐ | 🟡 |
| F-32 Sobres temáticos con coins | Mecánica | ⭐⭐⭐ | 🟡 |
| F-33 Regalar cromo a un amigo | Mecánica | ⭐⭐ | 🟡 |
| F-34 Muro público en legendarios | Comunidad | ⭐⭐ | 🔴 |
| F-35 Hinchada por club de origen | Comunidad | ⭐ | 🟡 |
| F-36 Discord bot status | Comunidad | ⭐ | 🟡 |
| F-37 Pase mensual subscripción | Monetización | ⭐⭐⭐ | 🔴 |
| F-38 Tienda cosmetics rotativa | Monetización | ⭐⭐ | 🔴 |
| F-39 Cromos firmados pagos | Monetización | ⭐ | 🔴 |
| F-40 Stats deep-dive en perfil | Métricas | ⭐⭐ | 🟡 |
| F-41 Tu Wrapped Cromiks | Métricas | ⭐⭐⭐ | 🟡 |
| F-42 Estás en el top X% | Métricas | ⭐ | 🟢 |
| F-43 Heatmap qué cromo le falta a todos | Métricas | ⭐ | 🟡 |
| F-44 Modo bajo-data (sin 3D) | A11y | ⭐⭐ | 🟡 |
| F-45 Modo daltónico | A11y | ⭐ | 🟢 |
| F-46 Alt text descriptivo | A11y | ⭐ | 🟢 |
| F-47 Modo nostalgia tipografía grande | A11y | ⭐ | 🟢 |
| F-48 Spotify banda sonora | Integraciones | ⭐⭐ | 🟡 |
| F-49 Recordatorio Google Calendar | Integraciones | ⭐ | 🟢 |
| F-50 Mi perfil PDF descargable | Integraciones | ⭐ | 🟢 |
| F-51 Modo aniversario 18/12 | Evento | ⭐⭐⭐ | 🟡 |
| F-52 Cronología paralela junio | Evento | ⭐⭐ | 🟡 |
| F-53 Watch-along clip embebido | Evento | ⭐ | 🟡 |
| F-54 Recomendación de pin | Smart | ⭐ | 🟢 |
| F-55 Tu próximo pack probablemente | Smart | ⭐ | 🟢 |

---

## Mis 5 apuestas fuertes

Si tuviera que elegir solo cinco para meter post-launch:

1. **F-19 Timeline del Mundial** — convierte el álbum en archivo narrativo. Más alineado con la visión de "Eterno Diciembre".
2. **F-08 Referrals** — el growth orgánico de un álbum coleccionable depende del boca-a-boca; necesitamos un canal medido.
3. **F-14 Variantes foil/holo** — agrega profundidad de colección sin doblar contenido. Sostiene re-engagement post 205/205.
4. **F-41 Wrapped Cromiks** — viralidad anual asegurada. Lo más fácil de difundir.
5. **F-51 Modo aniversario 18/12** — fecha cargada emocionalmente. Marketing automático sin spend.

Top-5 alternativa para retención early (primeros meses post-launch): F-01, F-02, F-06, F-32, F-09.
