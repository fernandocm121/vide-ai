<template>
  <section id="cta" class="bg-brand-500">
    <div class="container-page flex flex-col items-center gap-6 py-20 text-center">
      <h2 class="max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Seu próximo vídeo pode criar muito mais.
      </h2>
      <p class="max-w-xl text-lg text-white/85">
        Transforme horas de gravação em conteúdo inteligente. Comece grátis, sem
        cartão de crédito.
      </p>
      <div class="flex flex-col gap-3 sm:flex-row">
        <BaseButton variant="dark" size="lg" href="#">
          Começar agora
          <AppIcon name="arrow-right" class="size-4" />
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="lg"
          href="#planos"
          class="!text-white hover:!bg-white/10"
        >
          Ver planos
        </BaseButton>
      </div>
    </div>
  </section>
</template>
