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
import { JSXElement } from "solid-js"

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
        value={props.password()}
        background={useColorModeValue("$neutral3", "$neutral2")()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            props.enterCallback()
          }
        }}
        onInput={(e) => props.setPassword(e.currentTarget.value)}
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
          <Button onClick={() => props.enterCallback()}>
            {t("global.ok")}
          </Button>
        </HStack>
      </HStack>
    </VStack>
  )
}
export default Password
