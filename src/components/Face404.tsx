import { useColorModeValue } from "@hope-ui/solid"

/**
 * 404 脸部动画（源自 codepen 经典 404 face 动画）
 * - 眼睛上移 + 瞳孔转动 + 眨眼 + 嘴巴浮现 + 鼻子下移
 * - 颜色跟随明暗模式（light: 深灰 #292d33；dark: 浅灰 #d6d9de）
 * 仅在分享过期/被取消的错误页展示。
 */
const face404Style = `
.face404__eyes,
.face404__eye-lid,
.face404__mouth-left,
.face404__mouth-right,
.face404__nose,
.face404__pupil {
  animation: face404-eyes 1s 0.3s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
.face404__eye-lid,
.face404__pupil {
  animation-duration: 4s;
  animation-delay: 1.3s;
  animation-iteration-count: infinite;
}
.face404__eye-lid {
  animation-name: face404-eye-lid;
}
.face404__mouth-left,
.face404__mouth-right {
  animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
}
.face404__mouth-left {
  animation-name: face404-mouth-left;
}
.face404__mouth-right {
  animation-name: face404-mouth-right;
}
.face404__nose {
  animation-name: face404-nose;
}
.face404__pupil {
  animation-name: face404-pupil;
}
@keyframes face404-eye-lid {
  from, 40%, 45%, to {
    transform: translateY(0);
  }
  42.5% {
    transform: translateY(17.5px);
  }
}
@keyframes face404-eyes {
  from {
    transform: translateY(112.5px);
  }
  to {
    transform: translateY(15px);
  }
}
@keyframes face404-pupil {
  from, 37.5%, 40%, 45%, 87.5%, to {
    stroke-dashoffset: 0;
    transform: translate(0, 0);
  }
  12.5%, 25%, 62.5%, 75% {
    stroke-dashoffset: 0;
    transform: translate(-35px, 0);
  }
  42.5% {
    stroke-dashoffset: 35;
    transform: translate(0, 17.5px);
  }
}
@keyframes face404-mouth-left {
  from, 50% {
    stroke-dashoffset: -102;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes face404-mouth-right {
  from, 50% {
    stroke-dashoffset: 102;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes face404-nose {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(0, 22.5px);
  }
}
`

if (typeof document !== "undefined" && !document.getElementById("face404-style")) {
  const styleEl = document.createElement("style")
  styleEl.id = "face404-style"
  styleEl.textContent = face404Style
  document.head.appendChild(styleEl)
}

export const Face404 = () => {
  const color = useColorModeValue("#292d33", "#d6d9de")()
  return (
    <svg
      class="face404"
      viewBox="0 0 320 380"
      width="180px"
      height="auto"
      aria-hidden="true"
      style={{
        display: "block",
        color: color,
      }}
    >
      <g
        fill="none"
        stroke="currentcolor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="25"
      >
        <g class="face404__eyes" transform="translate(0, 112.5)">
          <g transform="translate(15, 0)">
            <polyline class="face404__eye-lid" points="37,0 0,120 75,120" />
            <polyline
              class="face404__pupil"
              points="55,120 55,155"
              stroke-dasharray="35 35"
            />
          </g>
          <g transform="translate(230, 0)">
            <polyline class="face404__eye-lid" points="37,0 0,120 75,120" />
            <polyline
              class="face404__pupil"
              points="55,120 55,155"
              stroke-dasharray="35 35"
            />
          </g>
        </g>
        <rect
          class="face404__nose"
          rx="4"
          ry="4"
          x="132.5"
          y="112.5"
          width="55"
          height="155"
        />
        <g stroke-dasharray="102 102" transform="translate(65, 334)">
          <path
            class="face404__mouth-left"
            d="M 0 30 C 0 30 40 0 95 0"
            stroke-dashoffset="-102"
          />
          <path
            class="face404__mouth-right"
            d="M 95 0 C 150 0 190 30 190 30"
            stroke-dashoffset="102"
          />
        </g>
      </g>
    </svg>
  )
}
