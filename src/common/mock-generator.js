/* 内部开发工具箱 — Mock 数据生成器 */
/* 从真实数据推断 Schema，智能生成假数据（参考 Faker.js 思路）*/
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  // ========== 数据库 ==========

  // 中文姓氏（百家姓前100个）
  const SURNAMES = [
    '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
    '徐', '孙', '朱', '马', '胡', '郭', '林', '何', '高', '梁',
    '郑', '罗', '宋', '谢', '唐', '韩', '曹', '许', '邓', '萧',
    '冯', '曾', '程', '蔡', '彭', '潘', '袁', '于', '董', '余',
    '苏', '叶', '吕', '魏', '蒋', '田', '杜', '丁', '沈', '姜'
  ];

  // 中文名字
  const GIVEN_NAMES = [
    '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军',
    '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞',
    '平', '刚', '桂英', '华', '建华', '建国', '秀云', '梅', '英', '雪'
  ];

  // 城市
  const CITIES = [
    '北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市',
    '武汉市', '西安市', '南京市', '重庆市', '天津市', '苏州市',
    '长沙市', '郑州市', '沈阳市', '青岛市', '宁波市', '东莞市'
  ];

  // 街道
  const STREETS = [
    '人民路', '解放路', '建设路', '中山路', '和平路', '新华路',
    '光明路', '胜利路', '朝阳路', '幸福路', '文化路', '友谊路'
  ];

  // 公司类型
  const COMPANY_TYPES = [
    '科技有限公司', '网络科技有限公司', '信息技术有限公司',
    '软件开发有限公司', '电子商务有限公司', '文化传媒有限公司',
    '咨询有限公司', '实业有限公司', '贸易有限公司'
  ];

  // 公司前缀
  const COMPANY_PREFIXES = [
    '阿里', '腾讯', '百度', '华为', '小米', '京东', '美团', '字节',
    '滴滴', '快手', '拼多多', '网易', '新浪', '搜狐', '携程', '去哪儿'
  ];

  // Lorem Ipsum 中文
  const LOREM_WORDS = [
    '的', '是', '在', '了', '和', '有', '我', '他', '不', '人',
    '都', '一', '个', '上', '也', '很', '到', '说', '要', '去',
    '就', '得', '可', '以', '会', '能', '好', '看', '时', '地'
  ];

  // ========== 工具函数 ==========

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min, max, decimals = 2) {
    const num = Math.random() * (max - min) + min;
    return parseFloat(num.toFixed(decimals));
  }

  function randomString(len = 8, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
    return Array.from({ length: len }, () => pick(chars.split(''))).join('');
  }

  function randomBoolean() {
    return Math.random() > 0.5;
  }

  // ========== Faker 风格的生成器 ==========

  const faker = {
    // 人名
    person: {
      fullName() {
        return pick(SURNAMES) + pick(GIVEN_NAMES);
      },
      firstName() {
        return pick(GIVEN_NAMES);
      },
      lastName() {
        return pick(SURNAMES);
      },
    },

    // 互联网
    internet: {
      email() {
        const name = randomString(6, 'abcdefghijklmnopqrstuvwxyz');
        const domains = ['example.com', 'test.com', 'demo.com', 'mail.com'];
        return `${name}@${pick(domains)}`;
      },
      userName() {
        return randomString(8, 'abcdefghijklmnopqrstuvwxyz0123456789_');
      },
      password() {
        return randomString(12, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%');
      },
      url() {
        const protocols = ['http', 'https'];
        const domains = ['example.com', 'test.com', 'demo.com'];
        return `${pick(protocols)}://${pick(domains)}/${randomString(8)}`;
      },
      avatar() {
        return `https://i.pravatar.cc/150?u=${randomString(8)}`;
      },
      ipv4() {
        return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`;
      },
      color() {
        return `#${randomString(6, '0123456789abcdef')}`;
      },
    },

    // 电话
    phone: {
      number() {
        const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
                         '150', '151', '152', '153', '155', '156', '157', '158', '159',
                         '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
        return pick(prefixes) + Array.from({ length: 8 }, () => randomInt(0, 9)).join('');
      },
    },

    // 地址
    location: {
      city() {
        return pick(CITIES);
      },
      street() {
        return pick(STREETS) + randomInt(1, 999) + '号';
      },
      address() {
        return pick(CITIES) + pick(STREETS) + randomInt(1, 999) + '号';
      },
      zipCode() {
        return Array.from({ length: 6 }, () => randomInt(0, 9)).join('');
      },
      latitude() {
        return randomFloat(-90, 90, 6);
      },
      longitude() {
        return randomFloat(-180, 180, 6);
      },
    },

    // 公司
    company: {
      name() {
        return pick(COMPANY_PREFIXES) + pick(COMPANY_TYPES);
      },
      suffix() {
        return pick(COMPANY_TYPES);
      },
    },

    // 日期时间
    date: {
      past() {
        const now = Date.now();
        const year = 365 * 24 * 60 * 60 * 1000;
        return now - randomInt(0, year);
      },
      future() {
        const now = Date.now();
        const year = 365 * 24 * 60 * 60 * 1000;
        return now + randomInt(0, year);
      },
      recent() {
        const now = Date.now();
        const week = 7 * 24 * 60 * 60 * 1000;
        return now - randomInt(0, week);
      },
      timestamp() {
        return Date.now();
      },
    },

    // 数字
    number: {
      int(min = 0, max = 1000) {
        return randomInt(min, max);
      },
      float(min = 0, max = 1000, decimals = 2) {
        return randomFloat(min, max, decimals);
      },
    },

    // 文本
    lorem: {
      word() {
        return pick(LOREM_WORDS);
      },
      words(count = 3) {
        return Array.from({ length: count }, () => pick(LOREM_WORDS)).join('');
      },
      sentence() {
        const len = randomInt(5, 15);
        return Array.from({ length: len }, () => pick(LOREM_WORDS)).join('') + '。';
      },
      paragraph() {
        const sentences = randomInt(3, 6);
        return Array.from({ length: sentences }, () => faker.lorem.sentence()).join('');
      },
    },

    // 金融
    finance: {
      amount(min = 0, max = 10000, decimals = 2) {
        return randomFloat(min, max, decimals);
      },
      account() {
        return Array.from({ length: 16 }, () => randomInt(0, 9)).join('');
      },
    },

    // 图片
    image: {
      avatar() {
        return faker.internet.avatar();
      },
      url(width = 640, height = 480) {
        return `https://picsum.photos/${width}/${height}?random=${randomInt(1, 1000)}`;
      },
    },

    // UUID
    datatype: {
      uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
      boolean() {
        return randomBoolean();
      },
    },
  };

  // ========== Schema 推断 ==========

  function inferSchema(data, fieldName = '') {
    if (data === null || data === undefined) {
      return { type: 'null' };
    }

    const type = Array.isArray(data) ? 'array' : typeof data;

    if (type === 'array') {
      const items = data.length > 0 ? inferSchema(data[0], fieldName) : { type: 'any' };
      return { type: 'array', items, length: data.length };
    }

    if (type === 'object') {
      const properties = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          properties[key] = inferSchema(data[key], key);
        }
      }
      return { type: 'object', properties };
    }

    return { type, fieldName };
  }

  // ========== 启发式生成 ==========

  function generateByFieldName(fieldName, type) {
    const lower = (fieldName || '').toLowerCase();

    // 姓名
    if (/^name$|^username$|^user_?name$|^realname$|^real_?name$/.test(lower)) {
      return faker.person.fullName();
    }
    if (/nickname|nick_?name/.test(lower)) {
      return faker.person.fullName();
    }
    if (/first_?name|given_?name/.test(lower)) {
      return faker.person.firstName();
    }
    if (/last_?name|surname|family_?name/.test(lower)) {
      return faker.person.lastName();
    }

    // 邮箱
    if (/email|mail/.test(lower)) {
      return faker.internet.email();
    }

    // 手机号
    if (/phone|mobile|tel|cellphone/.test(lower)) {
      return faker.phone.number();
    }

    // ID
    if (/^id$|^uid$|user_?id|account_?id|customer_?id/.test(lower)) {
      return faker.number.int(1000, 999999);
    }

    // UUID
    if (/uuid|guid/.test(lower)) {
      return faker.datatype.uuid();
    }

    // URL
    if (/^url$|link|href|website/.test(lower)) {
      return faker.internet.url();
    }

    // 头像/图片
    if (/avatar|photo|image|img|pic|picture/.test(lower)) {
      return faker.internet.avatar();
    }

    // IP
    if (/^ip$|ip_?address|ipv4/.test(lower)) {
      return faker.internet.ipv4();
    }

    // 颜色
    if (/color|colour/.test(lower)) {
      return faker.internet.color();
    }

    // 时间戳
    if (/time|date|timestamp|created_?at|updated_?at|deleted_?at/.test(lower)) {
      return faker.date.timestamp();
    }

    // 地址
    if (/address|addr/.test(lower)) {
      return faker.location.address();
    }
    if (/city/.test(lower)) {
      return faker.location.city();
    }
    if (/street/.test(lower)) {
      return faker.location.street();
    }
    if (/zip|zipcode|postal/.test(lower)) {
      return faker.location.zipCode();
    }

    // 公司
    if (/company|corp|corporation|organization/.test(lower)) {
      return faker.company.name();
    }

    // 金额
    if (/amount|price|cost|fee|balance|total/.test(lower)) {
      return faker.finance.amount();
    }

    // 账号
    if (/account|card_?number|bank_?account/.test(lower)) {
      return faker.finance.account();
    }

    // 密码
    if (/password|pwd|passwd/.test(lower)) {
      return faker.internet.password();
    }

    // 描述/内容
    if (/desc|description|content|comment|remark/.test(lower)) {
      return faker.lorem.sentence();
    }

    // 标题
    if (/title|subject|heading/.test(lower)) {
      return faker.lorem.words(3);
    }

    // 经纬度
    if (/latitude|lat/.test(lower)) {
      return faker.location.latitude();
    }
    if (/longitude|lng|lon/.test(lower)) {
      return faker.location.longitude();
    }

    // 状态
    if (/status|state/.test(lower) && type === 'number') {
      return faker.number.int(0, 2);
    }

    // 布尔值
    if (/is_|has_|can_|should_|enabled|disabled|active|deleted/.test(lower) && type === 'boolean') {
      return faker.datatype.boolean();
    }

    return null;
  }

  // ========== Mock 数据生成 ==========

  function generateMockData(schema) {
    if (!schema || !schema.type) return null;

    // 尝试根据字段名生成
    const byName = generateByFieldName(schema.fieldName, schema.type);
    if (byName !== null) return byName;

    // 按类型生成
    switch (schema.type) {
      case 'string':
        return faker.lorem.words(randomInt(2, 5));

      case 'number':
        return faker.number.int(1, 1000);

      case 'boolean':
        return faker.datatype.boolean();

      case 'array':
        const arrayLen = schema.length || randomInt(1, 5);
        return Array.from({ length: arrayLen }, () => generateMockData(schema.items));

      case 'object':
        const obj = {};
        for (const key in schema.properties) {
          if (schema.properties.hasOwnProperty(key)) {
            const propSchema = schema.properties[key];
            obj[key] = generateMockData({ ...propSchema, fieldName: key });
          }
        }
        return obj;

      case 'null':
        return null;

      default:
        return null;
    }
  }

  // 导出
  ns.mockGenerator = {
    inferSchema,
    generateMockData,
    generateByFieldName,
    faker, // 暴露 faker 对象供高级用户使用
  };
})();
