# Mock 数据生成器功能说明

## 两套生成器的使用位置

当前代码有两套独立实现：

| 使用位置 | 实现文件 | 调用方式 |
|---|---|---|
| 接口 Mock 面板的「生成假数据」按钮 | `devtools/panel.js` | 使用该文件内的 `inferSchema()` 和简化版 `generateMockData()` |
| 公共生成器及 Faker 风格辅助函数 | `src/common/mock-generator.js` | 通过 `globalThis.InternalDevToolkit.mockGenerator` 调用 |

面板按钮从所选方向的真实数据推断结构，再把生成结果放入编辑草稿，点击「保存」提交。常见字段表现如下：

| 字段 | 面板按钮 | 公共生成器 |
|---|---|---|
| `name`、`email`、`phone` | 姓名、邮箱、手机号格式字符串 | 姓名、邮箱、手机号格式字符串 |
| `uuid` | 1000～999999 的整数 | UUID（通用唯一标识符）字符串 |
| `createdAt` | 按原类型生成，数字生成 1～1000 的整数 | 时间戳 |
| `created_at` | 时间戳 | 时间戳 |
| `color` | 按原类型生成，字符串为随机字母和数字 | 十六进制颜色 |
| `company` | 按原类型生成 | 公司名称 |

下面的字段表、Faker 风格函数和复杂对象示例均对应公共生成器。维护面板按钮时应修改 `devtools/panel.js`；维护公共函数时应修改 `src/common/mock-generator.js`。OpenAPI / Swagger 导入另有按接口结构生成数据的逻辑，位于 `devtools/panel.js` 的导入部分。

## 公共生成器功能

### 1. 智能字段识别（启发式）

根据字段名自动识别类型并生成合理的假数据：

| 字段模式 | 示例字段名 | 生成数据 |
|---------|-----------|---------|
| **姓名** | `name`, `username`, `realName` | 王伟、张静、李明 |
| **邮箱** | `email`, `mail` | abc123@example.com |
| **手机号** | `phone`, `mobile`, `tel` | 13812345678 |
| **ID** | `id`, `userId`, `uid` | 123456 |
| **UUID** | `uuid`, `guid` | 550e8400-e29b-41d4-a716-446655440000 |
| **URL** | `url`, `link`, `href` | https://example.com/abc123 |
| **头像** | `avatar`, `photo`, `image` | https://i.pravatar.cc/150?u=abc |
| **IP** | `ip`, `ipAddress`, `ipv4` | 192.168.1.100 |
| **颜色** | `color`, `colour` | #3a7bd5 |
| **时间** | `time`, `createdAt`, `updatedAt` | 1719302400000 |
| **地址** | `address`, `addr` | 北京市朝阳路123号 |
| **城市** | `city` | 上海市 |
| **街道** | `street` | 人民路456号 |
| **邮编** | `zip`, `zipCode`, `postal` | 100000 |
| **公司** | `company`, `corporation` | 阿里科技有限公司 |
| **金额** | `amount`, `price`, `balance` | 1234.56 |
| **账号** | `account`, `cardNumber` | 6222021234567890 |
| **密码** | `password`, `pwd` | aB3$xY9@kL5# |
| **描述** | `desc`, `description`, `content` | 这是一段测试文本。 |
| **标题** | `title`, `subject` | 示例标题内容 |
| **经纬度** | `latitude`, `longitude` | 39.904200, 116.407396 |
| **状态** | `status`, `state` | 0, 1, 2 |
| **布尔值** | `isActive`, `hasPermission` | true, false |

### 2. Faker API（高级用户）

公共模块导出 `globalThis.InternalDevToolkit.mockGenerator.faker`。当前构建将模块打包进后台脚本和内容脚本，面板使用上文所述的本地实现。

在扩展的后台 Service Worker 控制台，或选择了本扩展内容脚本执行环境的控制台中，先取得对象再调用：

```javascript
const { faker } = globalThis.InternalDevToolkit.mockGenerator;

// 人名
faker.person.fullName()     // "王伟"
faker.person.firstName()    // "伟"
faker.person.lastName()     // "王"

// 互联网
faker.internet.email()      // "abc123@example.com"
faker.internet.userName()   // "user_abc123"
faker.internet.password()   // "aB3$xY9@kL5#"
faker.internet.url()        // "https://example.com/abc123"
faker.internet.avatar()     // "https://i.pravatar.cc/150?u=abc"
faker.internet.ipv4()       // "192.168.1.100"
faker.internet.color()      // "#3a7bd5"

// 电话
faker.phone.number()        // "13812345678"

// 地址
faker.location.city()       // "上海市"
faker.location.street()     // "人民路123号"
faker.location.address()    // "北京市朝阳路456号"
faker.location.zipCode()    // "100000"
faker.location.latitude()   // 39.904200
faker.location.longitude()  // 116.407396

// 公司
faker.company.name()        // "阿里科技有限公司"

// 日期时间
faker.date.past()           // 1640995200000（过去的时间戳）
faker.date.future()         // 1751587200000（未来的时间戳）
faker.date.recent()         // 1719216000000（最近7天）
faker.date.timestamp()      // 1719302400000（当前时间戳）

// 数字
faker.number.int(1, 100)    // 42
faker.number.float(0, 100, 2) // 23.45

// 文本
faker.lorem.word()          // "的"
faker.lorem.words(3)        // "这是一个"
faker.lorem.sentence()      // "这是一个测试句子。"
faker.lorem.paragraph()     // "这是第一句。这是第二句。..."

// 金融
faker.finance.amount()      // 1234.56
faker.finance.account()     // "6222021234567890"

// 图片
faker.image.avatar()        // "https://i.pravatar.cc/150?u=abc"
faker.image.url(800, 600)   // "https://picsum.photos/800/600?random=123"

// 数据类型
faker.datatype.uuid()       // "550e8400-e29b-41d4-a716-446655440000"
faker.datatype.boolean()    // true/false
```

## 公共生成器使用示例

### 示例 1：基础使用

原始数据：
```json
{
  "name": "张三",
  "email": "test@example.com",
  "phone": "13800138000"
}
```

在已加载公共模块的环境中执行：

```javascript
const generator = globalThis.InternalDevToolkit.mockGenerator;
const source = { name: '张三', email: 'test@example.com', phone: '13800138000' };
const generated = generator.generateMockData(generator.inferSchema(source));
```

一次可能的结果：
```json
{
  "name": "王伟",
  "email": "abc789@test.com",
  "phone": "13912345678"
}
```

### 示例 2：复杂对象

原始数据：
```json
{
  "userId": 123,
  "profile": {
    "name": "李四",
    "avatar": "https://example.com/avatar.jpg",
    "address": "北京市",
    "company": "某某公司"
  },
  "createdAt": 1640995200000
}
```

生成后：
```json
{
  "userId": 456789,
  "profile": {
    "name": "赵敏",
    "avatar": "https://i.pravatar.cc/150?u=xyz123",
    "address": "上海市人民路234号",
    "company": "腾讯网络科技有限公司"
  },
  "createdAt": 1719302450123
}
```

### 示例 3：数组数据

原始数据：
```json
{
  "users": [
    { "id": 1, "name": "张三", "email": "a@b.com" },
    { "id": 2, "name": "李四", "email": "c@d.com" }
  ]
}
```

生成后（非空数组保持原长度，每项结构取自第一个元素）：
```json
{
  "users": [
    { "id": 123456, "name": "王芳", "email": "user1@example.com" },
    { "id": 789012, "name": "刘洋", "email": "user2@test.com" }
  ]
}
```

空数组会推断为未知元素类型，生成时默认扩展为 1～5 个 `null`。面板简化生成器也采用这一处理。

## 🎨 字段识别规则

生成器使用 **正则表达式** 匹配字段名（不区分大小写）：

```javascript
// 示例：姓名识别
/^name$|^username$|^user_?name$|^realname$|^real_?name$/

// 匹配：name, userName, user_name, realName, real_name
// 不匹配：firstname, lastname, nickname
```

支持的命名风格：
- **驼峰式**：`userName`, `userId`, `createdAt`
- **下划线**：`user_name`, `user_id`, `created_at`
- **混合式**：`real_name`, `mobile_phone`

## 💡 高级用法

### 在扩展后台控制台中测试

```javascript
// 获取 faker 对象
const { faker } = globalThis.InternalDevToolkit.mockGenerator;

// 生成测试数据
const testUser = {
  id: faker.number.int(1000, 9999),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  address: faker.location.address(),
  company: faker.company.name(),
  createdAt: faker.date.recent()
};

console.log(testUser);
```

### 自定义字段识别

公共模块的字段识别规则位于 `src/common/mock-generator.js`。面板按钮的字段识别规则位于 `devtools/panel.js` 内的简化版 `generateMockData()`；两处实现各自维护。

## 📝 实现细节

### 1. 零依赖

所有代码都内联在 `mock-generator.js` 中，不依赖外部库。

### 2. 数据库

- **中文姓氏**：百家姓前 50 个
- **中文名字**：30 个常见名字
- **城市**：18 个一线/新一线城市
- **街道**：12 个常见街道名
- **公司**：16 个知名公司前缀 + 9 种公司类型

### 3. 递归和性能

`inferSchema()` 和 `generateMockData()` 会递归处理对象及数组，当前代码未设置递归深度上限。处理耗时取决于数据量和嵌套深度，实际性能需用目标数据测量。

## 🔧 扩展指南

如果需要扩展公共生成器的字段识别规则：

1. 编辑 `src/common/mock-generator.js`
2. 在 `generateByFieldName()` 函数中添加规则：

```javascript
// 示例：添加"部门"字段识别
if (/department|dept/.test(lower)) {
  const departments = ['技术部', '市场部', '财务部', '人事部'];
  return pick(departments);
}
```

3. 重新构建：`npm run build`
4. 重新加载插件，在扩展后台控制台调用公共生成器验证结果。

若要扩展面板的「生成假数据」按钮，应在 `devtools/panel.js` 的简化生成器中添加规则，再构建、重新加载扩展，重开开发者工具验证按钮。只修改公共模块时，面板按钮继续使用自己的实现。

## 📚 参考资料

- [Faker.js 官方文档](https://fakerjs.dev/)
- [百家姓](https://zh.wikipedia.org/wiki/%E7%99%BE%E5%AE%B6%E5%A7%93)
- [中国手机号段](https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%9B%BD%E5%A4%A7%E9%99%86%E7%A7%BB%E5%8A%A8%E7%94%B5%E8%AF%9D%E5%8F%B7%E7%A0%81)

---

**版本**: v1.0  
**文档核对时间**: 2026-10-28
**状态**: ✅ 已实现
