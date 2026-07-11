# iOS 27 固定温度验收开关设计

## 目标

在 Surge iOS 27 模块中增加临时参数 `Debug.FixedTemperature:2`，让天气 App 主界面的当前温度和体感温度显示为 `2°C`，直观验证 WeatherKit v3 响应已被脚本改写。

## 范围

- 只覆盖 `currentWeather.temperature` 与 `currentWeather.temperatureApparent`。
- 小时预报、每日最高/最低温和 Apple metadata 保持不变。
- 参数为空、缺失或不是有限数字时不覆盖温度。
- 固定温度模式用于验证注入链路，不用于证明数据来自彩云。

## 实现

复用现有 `Settings.Debug`，不新增类或依赖。响应处理完成数据源注入后，在原位 FlatBuffer patch 前应用可选固定温度。Surge 两个 iOS 27 模块默认传入 `Debug.FixedTemperature:2`，并升级版本与缓存参数。

## 验证

- 先增加失败测试，证明启用参数后当前温度和体感温度必须为 `2`。
- 验证原始 FlatBuffer 长度、Apple metadata 和每日/小时温度不变。
- 运行全量测试、生产构建、语法检查和远端 raw URL 标记检查。

## 退出方式

真机确认显示 `2°C` 后，将 `Debug.FixedTemperature` 留空或发布下一版本移除默认值，即恢复真实彩云温度。
