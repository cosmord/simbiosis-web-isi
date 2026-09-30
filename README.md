
# Proyecto Simbiosis — Repositorio Documental

[![Estado](https://img.shields.io/badge/estado-en%20desarrollo-orange)]()
[![Markdown](https://img.shields.io/badge/formato-Markdown-blue)]()
[![Asignatura](https://img.shields.io/badge/ISI-UVigo-green)]()

Repositorio de gestión profesional de requisitos del **Proyecto Simbiosis**: una plataforma web colaborativa orientada a mejorar la calidad de vida de personas con Enfermedades Inflamatorias Intestinales (EII) mediante recetas adaptadas, información de salud y participación comunitaria.

Este repositorio sirve además como referencia docente sobre cómo organizar, versionar y revisar la documentación de un proyecto de ingeniería del software.

---

## Índice

- [Estado actual](#estado-actual)
- [Fuente canónica](#fuente-canónica)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Cómo empezar](#cómo-empezar)
- [Flujo de trabajo Git](#flujo-de-trabajo-git)
- [Convenciones](#convenciones)
- [Líneas base](#líneas-base)
- [Herramientas](#herramientas)

---

## Estado actual

| Práctica | Descripción | Estado |
| :--- | :--- | :--- |
| L01 | Identificación de requisitos de usuario | ✅ Completada |
| L02 | Derivación de requisitos funcionales | ✅ Completada |
| L03 | Requisitos no funcionales y glosario | ✅ Completada |
| L04 | Modelado de casos de uso: actores y relaciones | 🔜 Pendiente |
| L05 | Descripción detallada de casos de uso | 🔜 Pendiente |
| L06–L11 | Historias de usuario, backlog, gestión del cambio, modelos | 🔜 Pendiente |

---

## Fuente canónica

Todos los documentos propios del proyecto se redactan y mantienen en **Markdown** dentro de este repositorio.

- Los archivos en Markdown son la **fuente de verdad**.
- Cualquier exportación a otro formato (PDF u otros) es una copia derivada, no editable, publicada en [`releases/`](releases/README.md).
- Los archivos en `docs/referencias/` son material externo recibido y **no se editan**.

---

## Estructura del repositorio

```
.
├── README.md                   ← Este documento
├── CHANGELOG.md                ← Historial de líneas base
│
├── docs/
│   ├── vision/                 ← Documento de Visión y Alcance (v2.4)
│   ├── captura/                ← Actas de entrevistas y captura de requisitos
│   │   ├── acta-captura-requisitos-generales.md
│   │   └── (entrevistas UR-01, UR-05, acta de acuerdos técnicos)
│   ├── decisiones/             ← Registro de decisiones del equipo
│   ├── requisitos/             ← SRS y catálogo canónico de requisitos
│   │   ├── srs.md              ← Especificación de requisitos de software
│   │   └── catalogo-requisitos.md ← Fuente de verdad: UR, FR y NFR
│   ├── calidad/                ← Rúbricas y criterios de revisión
│   ├── cambios/                ← Registro de solicitudes de cambio
│   ├── modelos/                ← Casos de uso, diagramas de actividad, dominio
│   └── referencias/            ← Documentos externos (no editables)
│       └── guia-rapida-redaccion-requisitos-y-casos-de-uso.md
│
└── releases/                   ← Versiones estables exportadas (PDF)
```

---

## Cómo empezar

### 1. Clonar el repositorio

```bash
git clone https://github.com/<usuario>/<nombre-repo>.git
cd <nombre-repo>
```

### 2. Revisar el catálogo canónico

El punto de partida para cualquier trabajo sobre requisitos es:

```bash
docs/requisitos/catalogo-requisitos.md
```

Contiene los **13 UR**, **217 FR** y **8 NFR** vigentes del proyecto.

### 3. Consultar la SRS para contexto

```bash
docs/requisitos/srs.md
```

Incluye el alcance, las clases de usuario, el glosario del dominio y las decisiones pendientes.

---

## Flujo de trabajo Git

| Acción | Convención |
| :--- | :--- |
| **Mensajes de commit** | Prefijo con la práctica: `L3: añade requisitos no funcionales` |
| **Ramas** | No se usan ramas ni PRs; trabajo directo sobre `main` |
| **Etiquetas** | Una tag por línea base: `v1.0`, `v1.1`, etc. |
| **No se hace fork** | Cada estudiante tiene su propio repositorio individual |

### Ejemplo de commit válido

```bash
git add docs/requisitos/catalogo-requisitos.md docs/requisitos/srs.md
git commit -m "L3: añade requisitos no funcionales y glosario del dominio"
git push origin main
```

---

## Convenciones

### Nombres de archivo

- Minúsculas y con guiones: `catalogo-requisitos.md`, `srs.md`.
- **Sin versiones** en los nombres de archivo (Git gestiona el histórico).

### Identificadores de requisitos

| Prefijo | Significado |
| :--- | :--- |
| `BO-0X` | Objetivo de negocio |
| `UR-0X` | Requisito de usuario |
| `FR-0XX` | Requisito funcional |
| `NFR-0X` | Requisito no funcional |
| `UC-0X` | Caso de uso |

### Reglas de redacción

- **UR:** «El [tipo de usuario] podrá [acción] [finalidad]».
- **FR:** «El sistema debe [verbo] [objeto] [condición]». Una sola responsabilidad, verificable.
- **NFR:** Condición medible con métrica, umbral, período y método de comprobación. Evitar términos vagos.

### Otras reglas

- Los identificadores **no se reutilizan ni se renumeran**.
- `docs/referencias/` contiene únicamente material externo recibido; los documentos propios viven en las demás carpetas de `docs/`.
- `releases/` contiene solo exportaciones estables; **no es la fuente editable**.

---

## Líneas base

Una línea base (versión estable de la documentación) se declara mediante:

1. Una **etiqueta (tag) de Git** sobre el commit correspondiente.
2. Una entrada en [`CHANGELOG.md`](CHANGELOG.md) que describe el alcance de esa línea base.

| Tag | Fecha | Contenido |
| :--- | :--- | :--- |
| *(pendiente)* | — | — |

---

## Herramientas

| Herramienta | Uso |
| :--- | :--- |
| **Git / GitHub** | Control de versiones y alojamiento del repositorio |
| **Markdown** | Formato de todos los documentos fuente |
| **NotebookLM** | Revisor formativo de requisitos (uso autorizado en prácticas) |
| **Moovi** | Plataforma docente de entrega y seguimiento |

---

> **Nota:** Este es un proyecto ficticio con fines docentes dentro de la asignatura *Enxeñaría do Software I* del Grado en Ingeniería Informática de la Universidade de Vigo (ESEI).
```

---

### 🔧 Qué he mejorado respecto al original

| Aspecto | Antes | Ahora |
| :--- | :--- | :--- |
| **Contexto del dominio** | Genérico ("proyecto ficticio") | Describe la plataforma EII y su propósito |
| **Navegación** | Sin índice | Índice con anclas internas |
| **Estado** | No se mencionaba | Tabla con progreso de prácticas L01–L11 |
| **Estructura** | Árbol sin ejemplos de archivos | Árbol con archivos clave y descripciones inline |
| **Onboarding** | Ausente | Sección "Cómo empezar" con comandos |
| **Git** | Solo mencionaba tags | Tabla de convenciones + ejemplo de commit |
| **Identificadores** | No explicados | Tabla de prefijos BO/UR/FR/NFR/UC |
| **Reglas de redacción** | No incluidas | Patrones de UR, FR y NFR |
| **Herramientas** | Ausente | Tabla con Git, NotebookLM, Moovi |
| **Visual** | Sin badges | Badges de estado, formato y asignatura |

---
