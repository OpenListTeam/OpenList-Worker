import {
  Badge,
  Box,
  Button,
  HStack,
  Td,
  Text,
  Tr,
  useColorModeValue,
  VStack,
} from "@hope-ui/solid"
import { Show } from "solid-js"
import { useRouter, useT } from "~/hooks"
import { PluginItem } from "~/types"
import { DeletePopover } from "../common/DeletePopover"
import { FaSolidPuzzlePiece } from "solid-icons/fa"

export interface PluginItemProps {
  plugin: PluginItem
  onConfig?: (plugin: PluginItem) => void
  onToggle: (plugin: PluginItem) => void
  onDelete: (plugin: PluginItem) => void
}

export function PluginOp(props: PluginItemProps) {
  const t = useT()
  const { to } = useRouter()
  return (
    <HStack spacing="$2">
      <Button
        size="sm"
        onClick={() => {
          to(`/@manage/plugins/config/${encodeURIComponent(props.plugin.id)}`)
        }}
      >
        {t("global.edit")}
      </Button>
      <Button
        size="sm"
        colorScheme={props.plugin.enabled ? "warning" : "success"}
        onClick={() => {
          props.onToggle(props.plugin)
        }}
      >
        {t(`global.${props.plugin.enabled ? "disable" : "enable"}`)}
      </Button>
      <DeletePopover
        name={props.plugin.name}
        onClick={() => {
          props.onDelete(props.plugin)
        }}
      />
    </HStack>
  )
}

export function PluginListItem(props: PluginItemProps) {
  const t = useT()
  return (
    <Tr>
      <Td>
        <HStack spacing="$2">
          <Box
            w="$7"
            h="$7"
            rounded="$md"
            bgColor="$neutral3"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
            overflow="hidden"
          >
            <Show
              when={props.plugin.icon}
              fallback={<FaSolidPuzzlePiece size={14} />}
            >
              <img
                src={props.plugin.icon}
                alt="icon"
                style={{
                  width: "18px",
                  height: "18px",
                  "object-fit": "contain",
                }}
              />
            </Show>
          </Box>
          <VStack alignItems="start" spacing="0">
            <Text fontWeight="$medium">{props.plugin.name}</Text>
            <Text fontSize="$xs" color="$neutral10">
              {props.plugin.id}
            </Text>
          </VStack>
        </HStack>
      </Td>
      <Td>
        <Badge colorScheme="neutral">{props.plugin.type || "ui"}</Badge>
      </Td>
      <Td>
        <Text fontSize="$sm">v{props.plugin.version || "1.0.0"}</Text>
      </Td>
      <Td>
        <Text fontSize="$sm" color="$neutral10">
          {props.plugin.author || "Community"}
        </Text>
      </Td>
      <Td>
        <HStack spacing="$1">
          <Badge colorScheme={props.plugin.enabled ? "success" : "neutral"}>
            {t(`global.${props.plugin.enabled ? "enable" : "disable"}`)}
          </Badge>
          <Show when={props.plugin.high_privilege}>
            <Badge colorScheme="danger">Root</Badge>
          </Show>
        </HStack>
      </Td>
      <Td>
        <PluginOp {...props} />
      </Td>
    </Tr>
  )
}

export function PluginGridItem(props: PluginItemProps) {
  const t = useT()
  const shadow = useColorModeValue("$sm", "$none")
  const bg = useColorModeValue("$white", "$neutral3")
  const borderColor = useColorModeValue("$neutral4", "$neutral5")

  return (
    <VStack
      w="$full"
      p="$3"
      spacing="$3"
      rounded="$lg"
      border="1px solid"
      borderColor={props.plugin.high_privilege ? "$danger6" : borderColor()}
      bgColor={bg()}
      shadow={shadow()}
      alignItems="start"
      justifyContent="space-between"
    >
      <VStack alignItems="start" spacing="$1_5" w="$full">
        <HStack spacing="$2" w="$full" justifyContent="space-between">
          <HStack spacing="$2">
            <Box
              w="$8"
              h="$8"
              rounded="$md"
              bgColor="$neutral3"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
              overflow="hidden"
            >
              <Show
                when={props.plugin.icon}
                fallback={<FaSolidPuzzlePiece size={16} />}
              >
                <img
                  src={props.plugin.icon}
                  alt="icon"
                  style={{
                    width: "20px",
                    height: "20px",
                    "object-fit": "contain",
                  }}
                />
              </Show>
            </Box>
            <VStack alignItems="start" spacing="0">
              <Text fontWeight="$bold" fontSize="$sm">
                {props.plugin.name}
              </Text>
              <Text fontSize="$xs" color="$neutral10">
                {props.plugin.id}
              </Text>
            </VStack>
          </HStack>
          <HStack spacing="$1">
            <Badge colorScheme={props.plugin.enabled ? "success" : "neutral"}>
              {t(`global.${props.plugin.enabled ? "enable" : "disable"}`)}
            </Badge>
            <Show when={props.plugin.high_privilege}>
              <Badge colorScheme="danger">Root</Badge>
            </Show>
          </HStack>
        </HStack>

        <Text fontSize="$xs" color="$neutral10" noOfLines={2} minH="32px">
          {props.plugin.description || t("plugins.empty_desc")}
        </Text>

        <HStack spacing="$2" fontSize="$xs" color="$neutral9">
          <span>v{props.plugin.version || "1.0.0"}</span>
          <span>•</span>
          <span>{props.plugin.author || "Community"}</span>
          <span>•</span>
          <Badge colorScheme="neutral">{props.plugin.type || "ui"}</Badge>
        </HStack>
      </VStack>

      <HStack spacing="$2" w="$full" justifyContent="end">
        <PluginOp {...props} />
      </HStack>
    </VStack>
  )
}
