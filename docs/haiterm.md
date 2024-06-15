# haiterm

## Description

## Usage

### Terminal keyboard shortcuts / mouse event

| function                               | mouse       | shotcut-key       |
| :--                                    | :--:        | :--:              |
| select text with mouse                 | left + move |                   |
| select text with keyboard              |             | shift + ← / →     |
| select all text                        |             | ctrl + a          |
| paste                                  | center      | ctrl + v          |
| paste (path/url)     [*4]              | drop file   |                   |
| copy                 [*1]              |             | ctrl + c          |
| home                                   |             | home / ctrl + ←   |
| end                                    |             | end  / ctrl + →   |
| context menu         [*2]              | right       |                   |
| Scroll up a line     [*2]              |             | ctrl+alt+PageUp   |
| Scroll down a line   [*2]              |             | ctrl+alt+PageDown |
| Scroll to the top    [*2]              |             | ctrl+Home         |
| Scroll to the bottom [*2]              |             | ctrl+End          |
| Scroll up a page     [*3]              |             | shift + PageUp    |
| Scroll down a page   [*3]              |             | shift + PageDown  |
| Cycle through previously used commands |             | ↑ / ↓             |

[*1] priority : select with mouse > select with keybord 
[*2] terminal event
[*3] browser default event
[*4] webview event

- Upcoming?
  - scroll to bottom : ctrl + l
  - Scroll to the previous/next command : Ctrl+Up/Down
  - Move cursor word by word : alt+Left/Right
  - find : ctrl + F

### commands

**command type**

- cmdlet   : haitermに備わる命令
  - powershellの様に.dllで実行効率が良いということはない
- action   : 後から機能追加された命令
  - 主にjavascriptでのコード = フロントエンドの操作
  - powershellの様にpowershellスクリプトの意味はない
- function : 後から機能追加された命令
  - webviewを通したonlineでしか動かない命令
- script   : スクリプトコード
- executor : 後から機能追加された命令
  - webviewの機能を使用してるのでofflineで機能しないコード
- alias    : 偽名、別名、通称

**basic commands**

| name                                 | type        | note              |
| :--                                  | :--:        | :--:              |
| get-command                          | cmdlet      | show command list |

