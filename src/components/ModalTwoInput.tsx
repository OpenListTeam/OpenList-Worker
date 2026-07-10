import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  FormHelperText,
  VStack,
} from "@hope-ui/solid"
import { createSignal, JSXElement, Show } from "solid-js"
import { useT } from "~/hooks"
import { notify, validateFilename } from "~/utils"
export type ModalTwoInputProps = {
  opened: boolean
  onClose: () => void
  title: string
  onSubmit?: (text1: string, text2: string) => void // Update onSubmit to accept two input texts
  type?: string
  defaultValue1?: string // Update defaultValue to defaultValue1
  defaultValue2?: string // Add defaultValue2 for second input
  loading?: boolean
  tips?: string
  topSlot?: JSXElement
  validateFilename?: boolean
}
export const ModalTwoInput = (props: ModalTwoInputProps) => {
  const [value1, setValue1] = createSignal(props.defaultValue1 ?? "") // Update value and setValue to value1 and setValue1
  const [value2, setValue2] = createSignal(props.defaultValue2 ?? "") // Add value2 and setValue2 for second input
  const [validationError1, setValidationError1] = createSignal<string>("")
  const [validationError2, setValidationError2] = createSignal<string>("")
  const t = useT()

  const handleInput1 = (newValue: string) => {
    setValue1(newValue)
    if (props.validateFilename) {
      const validation = validateFilename(newValue)
      setValidationError1(validation.valid ? "" : validation.error || "")
    } else {
      setValidationError1("")
    }
  }

  const handleInput2 = (newValue: string) => {
    setValue2(newValue)
    if (props.validateFilename) {
      const validation = validateFilename(newValue)
      setValidationError2(validation.valid ? "" : validation.error || "")
    } else {
      setValidationError2("")
    }
  }

  const submit = () => {
    if (props.validateFilename) {
      const validation1 = validateFilename(value1())
      const validation2 = validateFilename(value2())

      if (!validation1.valid) {
        notify.warning(t(`global.${validation1.error}`))
        return
      }
      if (!validation2.valid) {
        notify.warning(t(`global.${validation2.error}`))
        return
      }
    } else {
      if (!value1() || !value2()) {
        notify.warning(t("global.empty_input"))
        return
      }
    }
    props.onSubmit?.(value1(), value2()) // Update onSubmit to pass both input values
  }
  return (
    <Modal
      blockScrollOnMount={false}
      opened={props.opened}
      onClose={props.onClose}
      initialFocus="#modal-input1"
    >
      <ModalOverlay />
      <ModalContent>
        {/* <ModalCloseButton /> */}
        <ModalHeader>{t(props.title)}</ModalHeader>
        <ModalBody>
          <Show when={props.topSlot}>{props.topSlot}</Show>
          <Show
            when={props.type === "text"}
            fallback={
              <VStack spacing="$2">
                <Input
                  id="modal-input1" // Update id to "modal-input1" for first input
                  type={props.type}
                  value={value1()} // Update value to value1 for first input
                  invalid={!!validationError1()}
                  onInput={(e) => {
                    handleInput1(e.currentTarget.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submit()
                    }
                  }}
                />
                <Show when={validationError1()}>
                  <FormHelperText color="$danger9">
                    {t(`global.${validationError1()}`)}
                  </FormHelperText>
                </Show>
                <Input
                  id="modal-input2" // Add second input with id "modal-input2"
                  type={props.type}
                  value={value2()} // Bind value to value2 for second input
                  invalid={!!validationError2()}
                  onInput={(e) => {
                    handleInput2(e.currentTarget.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submit()
                    }
                  }}
                />
                <Show when={validationError2()}>
                  <FormHelperText color="$danger9">
                    {t(`global.${validationError2()}`)}
                  </FormHelperText>
                </Show>
              </VStack>
            }
          >
            <VStack spacing="$2">
              <Textarea
                id="modal-input1" // Update id to "modal-input1" for first input
                value={value1()} // Update value to value1 for first input
                invalid={!!validationError1()}
                onInput={(e) => {
                  handleInput1(e.currentTarget.value)
                }}
              />
              <Show when={validationError1()}>
                <FormHelperText color="$danger9">
                  {t(`global.${validationError1()}`)}
                </FormHelperText>
              </Show>
              <Textarea
                id="modal-input2" // Add second input with id "modal-input2"
                value={value2()} // Bind value to value2 for second input
                invalid={!!validationError2()}
                onInput={(e) => {
                  handleInput2(e.currentTarget.value)
                }}
              />
              <Show when={validationError2()}>
                <FormHelperText color="$danger9">
                  {t(`global.${validationError2()}`)}
                </FormHelperText>
              </Show>
            </VStack>
          </Show>
          <Show when={props.tips}>
            <FormHelperText>{props.tips}</FormHelperText>
          </Show>
        </ModalBody>
        <ModalFooter display="flex" gap="$2">
          <Button onClick={props.onClose} colorScheme="neutral">
            {t("global.cancel")}
          </Button>
          <Button
            loading={props.loading}
            onClick={() => submit()}
            disabled={!value1() || !value2()}
          >
            {t("global.ok")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
