import {
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Text,
  useColorModeValue,
  VStack,
} from "@hope-ui/solid"
import { useRouter, useT } from "~/hooks"
import { JSXElement, createSignal } from "solid-js"

type PasswordProps = {
  title: string
  password: () => string
  setPassword: (s: string) => void
  enterCallback: () => void
  children?: JSXElement
}

const Password = (props: PasswordProps) => {
  const t = useT()
  const { back } = useRouter()
  // 输入框使用局部状态，初始为空：不预填历史密码（browser-password cookie 中
  // 可能残留上次分享的密码），避免访客看到/误用上一个分享的密码。
  const [input, setInput] = createSignal("")
  const submit = () => {
    props.setPassword(input())
    props.enterCallback()
  }
  return (
    <VStack
      w={{
        "@initial": "$full",
        "@md": "$lg",
      }}
      p="$8"
      spacing="$3"
      alignItems="start"
    >
      <Heading>{props.title}</Heading>
      <Input
        autofocus={true}
        type="password"
        value={input()}
        background={useColorModeValue("$neutral3", "$neutral2")()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            submit()
          }
        }}
        onInput={(e) => setInput(e.currentTarget.value)}
      />
      <HStack w="$full" justifyContent="space-between">
        <Flex
          fontSize="$sm"
          color="$neutral10"
          direction={{ "@initial": "column", "@sm": "row" }}
          columnGap="$1"
        >
          {props.children}
        </Flex>
        <HStack spacing="$2">
          <Button colorScheme="neutral" onClick={back}>
            {t("global.back")}
          </Button>
          <Button onClick={submit}>
            {t("global.ok")}
          </Button>
        </HStack>
      </HStack>
    </VStack>
  )
}
export default Password
