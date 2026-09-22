<script setup lang="ts">
interface MinutesContent {
  topics: { title: string; description: string }[]
  decisions: { text: string; note: string | null }[]
  tasks: { description: string; owner: string | null; dueDate: string | null }[]
}

interface MinutesStatusResponse {
  status: 'empty' | 'generating' | 'ready' | 'failed'
  content?: MinutesContent
  generatedAt?: string
  error?: string | null
}

const props = defineProps<{ videoId: string }>()
const { t } = useI18n()

const { status, content, generatedAt, error, busy, generate, retry } =
  useAiGeneration<MinutesContent>({
    get: () =>
      $fetch<MinutesStatusResponse>(`/api/videos/${props.videoId}/minutes`),
    post: () =>
      $fetch(`/api/videos/${props.videoId}/minutes`, {
        method: 'POST',
      }).then(() => undefined),
  })
</script>

<template>
  <AppAiGenerateCard
    icon="hash"
    :title="t('aiFeatures.minutes.emptyTitle')"
    :description="t('aiFeatures.minutes.emptyDescription')"
    :cta-label="t('aiFeatures.minutes.cta')"
    :status="status"
    :generated-at="generatedAt"
    :error="error"
    :busy="busy"
    @generate="generate"
    @retry="retry"
  >
    <div v-if="content" class="flex flex-col gap-6">
      <section>
        <h3
          class="text-xs font-semibold tracking-wider text-ink-soft uppercase"
        >
          {{ t('aiFeatures.minutes.topicsTitle') }}
        </h3>
        <p v-if="!content.topics.length" class="mt-2 text-sm text-ink-soft">
          {{ t('aiFeatures.minutes.topicsEmpty') }}
        </p>
        <ul v-else class="mt-2 flex flex-col gap-2">
          <li
            v-for="(topic, i) in content.topics"
            :key="i"
            class="rounded-xl border border-line bg-paper-2 p-3"
          >
            <p class="text-sm font-semibold text-ink">{{ topic.title }}</p>
            <p class="mt-0.5 text-sm text-ink-soft">{{ topic.description }}</p>
          </li>
        </ul>
      </section>

      <section>
        <h3
          class="text-xs font-semibold tracking-wider text-ink-soft uppercase"
        >
          {{ t('aiFeatures.minutes.decisionsTitle') }}
        </h3>
        <p
          v-if="!content.decisions.length"
          class="mt-2 text-sm text-ink-soft"
        >
          {{ t('aiFeatures.minutes.decisionsEmpty') }}
        </p>
        <ul v-else class="mt-2 flex flex-col gap-2">
          <li
            v-for="(d, i) in content.decisions"
            :key="i"
            class="rounded-xl border border-line bg-paper-2 p-3"
          >
            <p class="text-sm font-medium text-ink">{{ d.text }}</p>
            <p v-if="d.note" class="mt-0.5 text-xs text-ink-soft">
              {{ d.note }}
            </p>
          </li>
        </ul>
      </section>

      <section>
        <h3
          class="text-xs font-semibold tracking-wider text-ink-soft uppercase"
        >
          {{ t('aiFeatures.minutes.tasksTitle') }}
        </h3>
        <p v-if="!content.tasks.length" class="mt-2 text-sm text-ink-soft">
          {{ t('aiFeatures.minutes.tasksEmpty') }}
        </p>
        <ul v-else class="mt-2 flex flex-col gap-2">
          <li
            v-for="(task, i) in content.tasks"
            :key="i"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper-2 p-3"
          >
            <p class="text-sm text-ink">{{ task.description }}</p>
            <div class="flex shrink-0 items-center gap-2 text-xs">
              <span class="rounded-md bg-paper-3 px-2 py-1 text-ink-soft">
                {{ task.owner ?? t('aiFeatures.minutes.noOwner') }}
              </span>
              <span
                v-if="task.dueDate"
                class="rounded-md bg-brand-50 px-2 py-1 font-semibold text-brand-600"
              >
                {{ task.dueDate }}
              </span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </AppAiGenerateCard>
</template>
