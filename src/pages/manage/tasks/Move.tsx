import { useManageTitle, useT } from "~/hooks"
import { TypeTasks } from "./Tasks"
import { getPath } from "./helper"

const Move = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.move")
  return (
    <TypeTasks
      type="move"
      canRetry
      nameAnalyzer={{
        regex: /^move \[(.*\/([^\/]*))]\((.*\/([^\/]*))\) to \[(.+)]\((.+)\)$/,
        title: (matches) => {
          if (matches[4] !== "") return matches[4]
          return matches[2] === "" ? "/" : matches[2]
        },
        attrs: {
          [t(`tasks.attr.copy.src`)]: (matches) =>
            getPath(matches[1], matches[3]),
          [t(`tasks.attr.copy.dst`)]: (matches) =>
            getPath(matches[5], matches[6]),
        },
      }}
    />
  )
}

export default Move
