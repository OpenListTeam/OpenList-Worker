import {
  Box,
  Center,
  Flex,
  Heading,
  useColorModeValue,
  createDisclosure,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  IconButton,
  Tooltip,
  VStack,
} from "@hope-ui/solid"
import { SwitchColorMode } from "./SwitchColorMode"
import {
  ComponentProps,
  For,
  mergeProps,
  Show,
  JSXElement,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js"
import { AiOutlineFullscreen, AiOutlineFullscreenExit } from "solid-icons/ai"
import { BsFullscreen, BsFullscreenExit } from "solid-icons/bs"
import { useT } from "~/hooks"

export const Error = (props: {
  msg: string
  disableColor?: boolean
  h?: string
  actions?: JSXElement
}) => {
  const merged = mergeProps(
    {
      h: "$full",
    },
    props,
  )
  return (
    <Center h={merged.h} p="$2" flexDirection="column">
      <Box
        rounded="$lg"
        px="$4"
        py="$6"
        bgColor={useColorModeValue("white", "$neutral3")()}
      >
        <Heading
          css={{
            wordBreak: "break-all",
          }}
        >
          {props.msg}
        </Heading>
        <Show when={props.actions}>
          <Flex mt="$4" justifyContent="center">
            {props.actions}
          </Flex>
        </Show>
        <Show when={!props.disableColor}>
          <Flex mt="$2" justifyContent="end">
            <SwitchColorMode />
          </Flex>
        </Show>
      </Box>
    </Center>
  )
}

export const BoxWithFullScreen = (
  props: Parameters<typeof Box>[0] & { extraButtons?: JSXElement },
) => {
  const { isOpen: isFullView, onToggle } = createDisclosure()
  const [isFullScreen, setIsFullScreen] = createSignal(false)
  let containerRef: HTMLDivElement
  const t = useT()

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef!.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  onMount(() => {
    const fsHandler = () => setIsFullScreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", fsHandler)
    onCleanup(() => {
      document.removeEventListener("fullscreenchange", fsHandler)
    })
  })

  return (
    <Box
      ref={containerRef!}
      pos={isFullView() ? "fixed" : "relative"}
      w={isFullView() ? "100vw" : props.w}
      h={isFullView() ? "100vh" : props.h}
      top={0}
      left={0}
      zIndex={isFullView() ? "$modal" : undefined}
      transition="all 0.2s ease-in-out"
      css={{
        backdropFilter: isFullView() ? "blur(5px)" : undefined,
      }}
    >
      {props.children}
      <VStack
        pos="absolute"
        right="$2"
        bottom="$2"
        spacing="$2"
        opacity="0.7"
        _hover={{ opacity: "1" }}
        transition="opacity 0.3s ease"
        pointerEvents="auto"
        zIndex="$docked"
      >
        {props.extraButtons}
        <Show when={!isFullScreen()}>
          {/* Full view toggle */}
          <Tooltip
            label={
              isFullView()
                ? t("home.preview.exit_fullview")
                : t("home.preview.fullview")
            }
            withArrow
          >
            <IconButton
              aria-label={
                isFullView()
                  ? t("home.preview.exit_fullview")
                  : t("home.preview.fullview")
              }
              icon={isFullView() ? <BsFullscreenExit /> : <BsFullscreen />}
              onClick={onToggle}
              colorScheme="neutral"
              size="sm"
            />
          </Tooltip>
        </Show>

        {/* Native fullscreen toggle */}
        <Tooltip
          label={
            isFullScreen()
              ? t("home.preview.exit_fullscreen")
              : t("home.preview.fullscreen")
          }
          withArrow
        >
          <IconButton
            aria-label={
              isFullScreen()
                ? t("home.preview.exit_fullscreen")
                : t("home.preview.fullscreen")
            }
            icon={
              isFullScreen() ? (
                <AiOutlineFullscreenExit />
              ) : (
                <AiOutlineFullscreen />
              )
            }
            onClick={toggleFullscreen}
            colorScheme="neutral"
            size="sm"
          />
        </Tooltip>
      </VStack>
    </Box>
  )
}

export function SelectWrapper<T extends string | number>(props: {
  value: T
  onChange: (v: T) => void
  options: {
    value: T
    label?: string
  }[]
  alwaysShowBorder?: boolean
  size?: "xs" | "sm" | "md" | "lg"
  w?: ComponentProps<typeof SelectTrigger>["w"]
}) {
  return (
    <Select size={props.size} value={props.value} onChange={props.onChange}>
      <SelectTrigger
        borderColor={props.alwaysShowBorder ? "$info5" : undefined}
        w={props.w}
      >
        <SelectValue />
        <SelectIcon />
      </SelectTrigger>
      <SelectContent>
        <SelectListbox>
          <For each={props.options}>
            {(item) => (
              <SelectOption value={item.value}>
                <SelectOptionText>{item.label ?? item.value}</SelectOptionText>
                <SelectOptionIndicator />
              </SelectOption>
            )}
          </For>
        </SelectListbox>
      </SelectContent>
    </Select>
  )
}
