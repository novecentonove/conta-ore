<script lang="ts" setup>
import type { ButtonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonVariants["variant"]
  cancelVariant?: ButtonVariants["variant"]
  confirmDisabled?: boolean
  cancelDisabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: "Conferma",
  cancelLabel: "Annulla",
  confirmVariant: "destructive",
  cancelVariant: "outline",
})

const emit = defineEmits<{
  (event: "update:open", value: boolean): void
  (event: "confirm"): void
  (event: "cancel"): void
}>()
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ props.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="props.description || $slots.description">
          <slot name="description">
            {{ props.description }}
          </slot>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <slot />
      <AlertDialogFooter>
        <AlertDialogCancel
          :variant="props.cancelVariant"
          :disabled="props.cancelDisabled"
          class="text-foreground"
          @click="emit('cancel')"
        >
          {{ props.cancelLabel }}
        </AlertDialogCancel>
        <AlertDialogAction
          :variant="props.confirmVariant"
          :disabled="props.confirmDisabled"
          @click="emit('confirm')"
        >
          {{ props.confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
