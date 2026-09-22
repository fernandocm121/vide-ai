<script setup lang="ts">
import { formatTimestamp } from '~/utils/media'

interface TitleItem {
  text: string
  style: string
}
interface ShortIdea {
  startMs: number
  endMs: number
  hook: string
  reason: string
  script: string[]
}
interface SocialPost {
  platform: 'x' | 'instagram' | 'linkedin' | 'tiktok'
  text: string
}
interface ContentData {
  titles: TitleItem[]
  description: string
  hashtags: string[]
  shortIdeas: ShortIdea[]
  socialPosts: SocialPost[]
}
interface ContentStatusResponse {
  status: 'empty' | 'generating' | 'ready' | 'failed'
  content?: ContentData
  generatedAt?: string
  error?: string | null
}

const props = defineProps<{ videoId: string }>()
const emit = defineEmits<{ seek: [ms: number] }>()
const { t } = useI18n()

const { status, content, generatedAt, error, busy, generate, retry } =
  useAiGeneration<ContentData>({
    get: () =>
      $fetch<ContentStatusResponse>(`/api/videos/${props.videoId}/content`),
    post: () =>
      $fetch(`/api/videos/${props.videoId}/content`, {
        method: 'POST',
      }).then(() => undefined),
  })

const openSections = reactive({
  titles: true,
  description: false,
  shorts: false,
  social: false,
})
function toggle(key: keyof typeof openSections) {
  openSections[key] = !openSections[key]
}

const expandedIdea = ref<number | null>(null)
function toggleIdea(i: number) {
  expandedIdea.value = expandedIdea.value === i ? null : i
}

const PLATFORM_LABELS: Record<SocialPost['platform'], string> = {
  x: 'X / Twitter',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* clipboard indisponível */
  }
}
</script>

<template>
  <AppAiGenerateCard
    icon="film"
    :title="t('aiFeatures.content.emptyTitle')"
    :description="t('aiFeatures.content.emptyDescription')"
    :cta-label="t('aiFeatures.content.cta')"
    :status="status"
    :generated-at="generatedAt"
    :error="error"
    :busy="busy"
    @generate="generate"
    @retry="retry"
  >
    <div v-if="content" class="flex flex-col divide-y divide-line">
      <!-- Títulos -->
      <section class="py-4 first:pt-0">
        <button
          type="button"
          class="flex w-full items-center justify-between text-left"
          @click="toggle('titles')"
        >
          <span class="text-sm font-semibold text-ink">{{
            t('aiFeatures.content.titlesTitle')
          }}</span>
          <AppIcon
            name="chevron-down"
            class="size-4 text-ink-soft transition-transform"
            :class="openSections.titles ? 'rotate-180' : ''"
          />
        </button>
        <div v-if="openSections.titles" class="mt-3 flex flex-col gap-2">
          <div
            v-for="(title, i) in content.titles"
            :key="i"
            class="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper-2 p-3"
          >
            <div class="min-w-0">
              <span
                class="rounded-md bg-paper-3 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-soft uppercase"
                >{{ title.style }}</span
              >
              <p class="mt-1 text-sm text-ink">{{ title.text }}</p>
            </div>
            <button
              class="shrink-0 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
              @click="copy(title.text)"
            >
              {{ t('aiFeatures.common.copy') }}
            </button>
          </div>
        </div>
      </section>

      <!-- Descrição -->
      <section class="py-4">
        <button
          type="button"
          class="flex w-full items-center justify-between text-left"
          @click="toggle('description')"
        >
          <span class="text-sm font-semibold text-ink">{{
            t('aiFeatures.content.descriptionTitle')
          }}</span>
          <AppIcon
            name="chevron-down"
            class="size-4 text-ink-soft transition-transform"
            :class="openSections.description ? 'rotate-180' : ''"
          />
        </button>
        <div v-if="openSections.description" class="mt-3 flex flex-col gap-3">
          <p class="text-sm leading-relaxed whitespace-pre-wrap text-ink">
            {{ content.description }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in content.hashtags"
              :key="tag"
              class="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600"
              >#{{ tag }}</span
            >
          </div>
          <div class="flex justify-end">
            <button
              class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
              @click="copy(content.description)"
            >
              {{ t('aiFeatures.content.copyDescription') }}
            </button>
          </div>
        </div>
      </section>

      <!-- Ideias de Shorts -->
      <section class="py-4">
        <button
          type="button"
          class="flex w-full items-center justify-between text-left"
          @click="toggle('shorts')"
        >
          <span class="text-sm font-semibold text-ink">{{
            t('aiFeatures.content.shortsTitle')
          }}</span>
          <AppIcon
            name="chevron-down"
            class="size-4 text-ink-soft transition-transform"
            :class="openSections.shorts ? 'rotate-180' : ''"
          />
        </button>
        <div v-if="openSections.shorts" class="mt-3 flex flex-col gap-2">
          <p v-if="!content.shortIdeas.length" class="text-sm text-ink-soft">
            {{ t('aiFeatures.content.shortsEmpty') }}
          </p>
          <div
            v-for="(idea, i) in content.shortIdeas"
            :key="i"
            class="rounded-xl border border-line bg-paper-2 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <button
                type="button"
                class="min-w-0 text-left"
                @click="emit('seek', idea.startMs)"
              >
                <p class="font-mono text-xs text-ink-soft">
                  {{ formatTimestamp(idea.startMs) }}–{{
                    formatTimestamp(idea.endMs)
                  }}
                </p>
                <p class="mt-0.5 text-sm font-semibold text-ink">
                  {{ idea.hook }}
                </p>
                <p class="mt-0.5 text-xs text-ink-soft">{{ idea.reason }}</p>
              </button>
              <button
                type="button"
                class="shrink-0 text-xs font-medium text-brand-600"
                @click="toggleIdea(i)"
              >
                {{
                  expandedIdea === i
                    ? t('aiFeatures.content.hideScript')
                    : t('aiFeatures.content.viewScript')
                }}
              </button>
            </div>
            <ol
              v-if="expandedIdea === i"
              class="mt-3 flex flex-col gap-1.5 border-t border-line pt-3"
            >
              <li
                v-for="(beat, bi) in idea.script"
                :key="bi"
                class="text-sm text-ink"
              >
                <span class="font-mono text-xs text-ink-soft"
                  >{{ bi + 1 }}.</span
                >
                {{ beat }}
              </li>
            </ol>
          </div>
        </div>
      </section>

      <!-- Redes sociais -->
      <section class="py-4 last:pb-0">
        <button
          type="button"
          class="flex w-full items-center justify-between text-left"
          @click="toggle('social')"
        >
          <span class="text-sm font-semibold text-ink">{{
            t('aiFeatures.content.socialTitle')
          }}</span>
          <AppIcon
            name="chevron-down"
            class="size-4 text-ink-soft transition-transform"
            :class="openSections.social ? 'rotate-180' : ''"
          />
        </button>
        <div
          v-if="openSections.social"
          class="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <div
            v-for="(post, i) in content.socialPosts"
            :key="i"
            class="rounded-xl border border-line bg-paper-2 p-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-ink-soft">{{
                PLATFORM_LABELS[post.platform]
              }}</span>
              <button
                class="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
                @click="copy(post.text)"
              >
                {{ t('aiFeatures.common.copy') }}
              </button>
            </div>
            <p class="mt-1.5 text-sm whitespace-pre-wrap text-ink">
              {{ post.text }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </AppAiGenerateCard>
</template>
