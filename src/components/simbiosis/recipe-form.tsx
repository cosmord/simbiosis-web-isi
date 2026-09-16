'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ImagePlus, Loader2, Plus, Sparkles, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ImageWithFallback } from './image-with-fallback'
import { cn } from '@/lib/utils'
import { api, jsonBody } from '@/lib/client-api'
import { useSimbiosis } from '@/lib/store'
import {
  RECIPE_CATEGORIES,
  RECIPE_TAGS,
  SUITABLE_FOR,
  type RecipeDetailData,
  type RecipeSummary,
} from '@/lib/types'

/**
 * Formulario de receta, en modo creación o edición.
 * En edición, los ingredientes y pasos se cargan del detalle si no vienen completos.
 */
export function RecipeForm() {
  const { viewParams, navigate, bumpRefresh } = useSimbiosis()
  const editing = viewParams.recipe as RecipeDetailData | RecipeSummary | undefined

  const [title, setTitle] = useState(editing?.title ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [category, setCategory] = useState(editing?.category ?? 'Comida')
  const [prepTime, setPrepTime] = useState(String(editing?.prepTime ?? 30))
  const [servings, setServings] = useState(String(editing?.servings ?? 2))
  const [image, setImage] = useState(editing?.image ?? '')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [tags, setTags] = useState<string[]>(editing?.tags ?? [])
  const [suitableFor, setSuitableFor] = useState<string[]>(editing?.suitableFor ?? [])
  const [ingredients, setIngredients] = useState<string[]>(
    editing && 'ingredients' in editing && editing.ingredients.length > 0
      ? editing.ingredients
      : ['']
  )
  const [steps, setSteps] = useState<string[]>(
    editing && 'steps' in editing && editing.steps.length > 0 ? editing.steps : ['']
  )

  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user } = useSimbiosis()

  // En edición, si faltan ingredientes/pasos (resumen del perfil), cargar el detalle
  useEffect(() => {
    if (!editing || ('ingredients' in editing && editing.ingredients.length > 0)) return
    let active = true
    setLoadingDetail(true)
    api<{ recipe: RecipeDetailData }>(`/api/recipes/${editing.id}`)
      .then((d) => {
        if (!active) return
        if (d.recipe.ingredients.length > 0) setIngredients(d.recipe.ingredients)
        if (d.recipe.steps.length > 0) setSteps(d.recipe.steps)
      })
      .catch(() => {})
      .finally(() => active && setLoadingDetail(false))
    return () => {
      active = false
    }
  }, [editing])

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  /** Genera una imagen de plato con IA a partir del título y la descripción. */
  async function generateImage() {
    setGeneratingImage(true)
    try {
      const d = await api<{ image: string }>('/api/recipes/generate-image', jsonBody('POST', {
        title: title.trim(),
        description: description.trim(),
      }))
      setImage(d.image)
      toast.success('¡Imagen generada! Se usará al publicar la receta.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar la imagen.')
    } finally {
      setGeneratingImage(false)
    }
  }

  async function submit() {
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean)
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean)
    const prep = Number(prepTime)
    const serv = Number(servings)

    if (!title.trim()) return toast.warning('El título de la receta es obligatorio.')
    if (!description.trim()) return toast.warning('La descripción de la receta es obligatoria.')
    if (cleanIngredients.length === 0)
      return toast.warning('Añade al menos un ingrediente.')
    if (cleanSteps.length === 0)
      return toast.warning('Añade al menos un paso de preparación.')
    if (!Number.isFinite(prep) || prep <= 0)
      return toast.warning('El tiempo de preparación debe ser mayor que 0.')
    if (!Number.isFinite(serv) || serv <= 0)
      return toast.warning('El número de raciones debe ser mayor que 0.')

    setSaving(true)
    const body = {
      title: title.trim(),
      description: description.trim(),
      category,
      prepTime: Math.round(prep),
      servings: Math.round(serv),
      image: image.trim(),
      tags,
      suitableFor,
      ingredients: cleanIngredients,
      steps: cleanSteps,
    }
    try {
      if (editing) {
        await api<{ recipe: RecipeSummary }>(`/api/recipes/${editing.id}`, jsonBody('PATCH', body))
        toast.success('Receta actualizada correctamente.')
        bumpRefresh()
        navigate('recipeDetail', { id: editing.id })
      } else {
        const res = await api<{ recipe: RecipeSummary }>('/api/recipes', jsonBody('POST', body))
        toast.success('¡Receta publicada! Gracias por compartirla.')
        bumpRefresh()
        navigate('recipeDetail', { id: res.recipe.id })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la receta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 min-h-9"
        onClick={() => (editing ? navigate('recipeDetail', { id: editing.id }) : navigate('recipes'))}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Cancelar
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UtensilsCrossed aria-hidden="true" className="size-6 text-primary" />
          {editing ? 'Editar receta' : 'Compartir una receta'}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cuantos más detalles des, más fácil será que la comunidad la cocine con éxito.
        </p>
      </div>

      {user && (user.role === 'NUTRITIONIST' || user.role === 'DOCTOR') && (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertDescription className="text-sm text-foreground">
            Como profesional, tus recetas se publicarán como validadas clínicamente y
            llevarán la insignia de verificación.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="recipe-title">Título</Label>
            <Input
              id="recipe-title"
              placeholder="Ej.: Crema de zanahoria y jengibre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recipe-description">Descripción</Label>
            <Textarea
              id="recipe-description"
              rows={3}
              placeholder="Explica por qué esta receta es adecuada para la EII y a quién se la recomiendas…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="recipe-category">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="recipe-category" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipe-prep">Tiempo (minutos)</Label>
              <Input
                id="recipe-prep"
                type="number"
                min={1}
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipe-servings">Raciones</Label>
              <Input
                id="recipe-servings"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recipe-image">
              URL de la imagen <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <div className="relative">
              <ImagePlus
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="recipe-image"
                placeholder="https://… o /images/recipes/mi-foto.png"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Puedes dejarlo vacío: se mostrará un diseño de respaldo con el logo de la comunidad.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-9 gap-1.5"
                disabled={generatingImage || title.trim().length < 3}
                onClick={() => void generateImage()}
                aria-label="Generar una imagen para esta receta con inteligencia artificial"
              >
                {generatingImage ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Sparkles aria-hidden="true" className="size-4 text-primary" />
                )}
                {generatingImage ? 'Generando…' : 'Generar con IA'}
              </Button>
            </div>
            {image && (
              <div className="relative h-36 w-full max-w-xs overflow-hidden rounded-xl border">
                <ImageWithFallback src={image} alt="Previsualización de la imagen de la receta" sizes="320px" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 size-7 rounded-full"
                  onClick={() => setImage('')}
                  aria-label="Quitar la imagen"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adecuación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-1.5">
              {RECIPE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={tags.includes(tag)}
                  onClick={() => toggle(tags, setTags, tag)}
                  className={cn(
                    'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    tags.includes(tag)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Apta para</Label>
            <div className="flex flex-wrap gap-1.5">
              {SUITABLE_FOR.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={suitableFor.includes(s)}
                  onClick={() => toggle(suitableFor, setSuitableFor, s)}
                  className={cn(
                    'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    suitableFor.includes(s)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ingredientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {loadingDetail ? (
            <p className="text-sm text-muted-foreground">Cargando ingredientes…</p>
          ) : (
            ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                >
                  {i + 1}
                </span>
                <Input
                  value={ing}
                  placeholder="Ej.: 200 g de arroz blanco"
                  aria-label={`Ingrediente ${i + 1}`}
                  onChange={(e) =>
                    setIngredients(ingredients.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  className="min-h-11"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ingrediente ${i + 1}`}
                  disabled={ingredients.length === 1}
                  onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}
                  className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))
          )}
          <Button
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={() => setIngredients([...ingredients, ''])}
          >
            <Plus aria-hidden="true" className="size-4" />
            Añadir ingrediente
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pasos de preparación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {loadingDetail ? (
            <p className="text-sm text-muted-foreground">Cargando pasos…</p>
          ) : (
            steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <Textarea
                  rows={2}
                  value={step}
                  placeholder="Describe este paso con detalle…"
                  aria-label={`Paso ${i + 1}`}
                  onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar paso ${i + 1}`}
                  disabled={steps.length === 1}
                  onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  className="mt-0.5 size-11 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
          <Button
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={() => setSteps([...steps, ''])}
          >
            <Plus aria-hidden="true" className="size-4" />
            Añadir paso
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-4">
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => (editing ? navigate('recipeDetail', { id: editing.id }) : navigate('recipes'))}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button className="min-h-11" onClick={() => void submit()} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {editing ? 'Guardar cambios' : 'Publicar receta'}
        </Button>
      </div>
    </div>
  )
}
