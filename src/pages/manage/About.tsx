import { Markdown } from "~/components"
import { useT, useManageTitle } from "~/hooks"
import { getSetting } from "~/store"
import { HStack, Text, Tag, TagLabel } from "@hope-ui/solid"
// Bundle the repo README at build time so the About page works offline
// and always matches the shipped version (no runtime network dependency).
import readme from "../../../README.md?raw"

const About = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.about")
  const version = getSetting("version") || ""
  return (
    <>
      <HStack mb="$2" spacing="$2" alignItems="center">
        <Tag colorScheme="accent" rounded="$full">
          <TagLabel>{version || "OpenListNext"}</TagLabel>
        </Tag>
        <Text color="$neutral9" fontSize="$sm">
          {t("manage.sidemenu.about")}
        </Text>
      </HStack>
      <Markdown children={readme} sanitize={true} />
    </>
  )
}

export default About
