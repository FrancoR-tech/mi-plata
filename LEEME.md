# Mi plata — cómo publicarla para que la use la gente

Esta carpeta es tu app, ya armada y lista para subir a internet. No es el
archivo suelto de antes: es el "auto completo" con el motor adentro. Solo
falta estacionarlo en la calle.

Vas a hacerlo con **Vercel**, que es gratis. Hay dos caminos. Elegí el
primero: no necesitás instalar nada ni tocar la terminal.

---

## Camino A — Sin terminal (el recomendado para vos)

### Paso 1. Creá una cuenta en GitHub
GitHub es el "garaje" donde va a vivir el código.

1. Entrá a **github.com** y hacé click en *Sign up*.
2. Registrate con tu mail. Es gratis.
3. Confirmá el mail que te llega.

### Paso 2. Subí esta carpeta a GitHub
1. Ya adentro de GitHub, arriba a la derecha, tocá el **+** y elegí
   *New repository*.
2. Ponele un nombre: `mi-plata`. Dejalo en **Public**. No toques nada más.
   Tocá *Create repository*.
3. En la página que aparece, buscá el link que dice
   *uploading an existing file* (subir un archivo existente).
4. **Importante:** antes de arrastrar, borrá de esta carpeta la subcarpeta
   `node_modules` si está (pesa muchísimo y no hace falta). Si no la ves,
   perfecto, ya está.
5. Arrastrá **todo el contenido de esta carpeta** a la ventana de GitHub.
6. Abajo, tocá *Commit changes*.

### Paso 3. Conectá Vercel
1. Entrá a **vercel.com** y tocá *Sign up*.
2. Elegí **Continue with GitHub**: así se conectan solos.
3. Ya adentro, tocá *Add New...* → *Project*.
4. Vercel te muestra tus repositorios de GitHub. Al lado de `mi-plata`,
   tocá *Import*.
5. No cambies ninguna configuración. Vercel reconoce solo que es una app
   de Vite. Tocá *Deploy*.
6. Esperá un minuto. Cuando termina, te da un link tipo
   `mi-plata-xxxx.vercel.app`. **Ese es el link que mandás.**

Listo. Cada vez que quieras cambiar algo, subís el archivo nuevo a GitHub
(Paso 2) y Vercel actualiza la web solo, sin que hagas nada.

---

## Camino B — Con terminal (si algún día querés)

Si tenés Node.js instalado en tu compu, desde esta carpeta:

```
npm install
npm run build
```

Eso arma la versión final en la carpeta `dist`. También podés instalar la
herramienta de Vercel (`npm i -g vercel`) y correr `vercel` para publicar
directo desde la terminal. Pero para tu primer test, el Camino A alcanza y
sobra.

---

## Para probarla en tu compu antes de publicar

Si querés verla andar en tu máquina primero:

```
npm install
npm run dev
```

Te va a dar una dirección `localhost` que abrís en el navegador. Eso corre
solo en tu compu, nadie más la ve. Sirve para revisar antes de mandar.

---

## Un detalle importante sobre los datos

Cada persona que abra tu link guarda **sus propios datos en su propio
navegador**. No hay un servidor central, nadie ve la plata de nadie, ni vos.
Eso es bueno para la privacidad y para empezar a testear. La contra: si
alguien abre el link en el celular y después en la compu, no comparte los
datos entre los dos. Para eso haría falta un backend con cuentas, que es un
proyecto aparte (lo que venías anotando como "V2").

Para un test donde querés que la gente lo pruebe y te cuente qué le parece,
así como está es exactamente lo que necesitás.
