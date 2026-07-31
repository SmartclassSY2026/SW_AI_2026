/**
 * 计算机辅助设计知识图谱数据
 * 5章 / 14节 / 65个知识点
 * 重点程度用文字标签 + 颜色表示（无星星符号）
 * 数据来源：D:/Download/计算机辅助设计知识图谱.docx
 */

const LEVEL_META = {
  core:     { label: '核心', bg: '#FCEBEB', color: '#A32D2D' },
  key:      { label: '重点', bg: '#FAEEDA', color: '#854F0B' },
  normal:   { label: '一般', bg: '#E6F1FB', color: '#185FA5' },
  know:     { label: '了解', bg: '#F1EFE8', color: '#5F5E5A' },
  optional: { label: '选学', bg: '#F1EFE8', color: '#888780' }
};

const KNOWLEDGE_GRAPH = {
  chapters: [
    {
      id: 1, name: '软件入门基础', color: '#185FA5',
      sections: [
        {
          id: '1.1', name: '软件入门与基础操作', groups: [
            { id: '1.1.1', name: '软件模块与文件管理', points: [
              { name: '三大核心模块功能', level: 'core' },
              { name: '文件新建保存规范', level: 'normal' }
            ]},
            { id: '1.1.2', name: '界面与视图操控', points: [
              { name: '界面四大分区功能', level: 'know' },
              { name: '鼠标视图操控', level: 'key' }
            ]}
          ]
        }
      ]
    },
    {
      id: 2, name: '二维草图设计', color: '#3B6D11',
      sections: [
        {
          id: '2.1', name: '草图环境与基础绘制', groups: [
            { id: '2.1.1', name: '草图环境', points: [
              { name: '草图环境操作', level: 'normal' },
              { name: '草图基准面选择', level: 'normal' }
            ]},
            { id: '2.1.2', name: '基础草图绘制', points: [
              { name: '直线矩形绘制', level: 'core' },
              { name: '圆弧图形绘制', level: 'core' },
              { name: '椭圆曲线绘制', level: 'normal' }
            ]}
          ]
        },
        {
          id: '2.2', name: '草图编辑约束与标注', groups: [
            { id: '2.2.1', name: '草图编辑', points: [
              { name: '草图实体操纵', level: 'normal' },
              { name: '倒角圆角编辑', level: 'key' },
              { name: '草图剪裁', level: 'key' },
              { name: '草图实体变换', level: 'key' }
            ]},
            { id: '2.2.2', name: '几何约束管理', points: [
              { name: '核心约束类型', level: 'core' },
              { name: '约束管理', level: 'key' }
            ]},
            { id: '2.2.3', name: '尺寸标注管理', points: [
              { name: '尺寸标注', level: 'core' },
              { name: '尺寸数值格式修改', level: 'key' }
            ]}
          ]
        }
      ]
    },
    {
      id: 3, name: '零件实体建模', color: '#BA7517',
      sections: [
        {
          id: '3.1', name: '基础拉伸类零件特征', groups: [
            { id: '3.1.1', name: '拉伸凸台切除', points: [
              { name: '拉伸草图要求', level: 'core' },
              { name: '拉伸深度类型参数', level: 'core' },
              { name: '拉伸切除', level: 'core' },
              { name: '薄壁拉伸', level: 'normal' }
            ]},
            { id: '3.1.2', name: '旋转凸台切除', points: [
              { name: '旋转草图轴线设置', level: 'key' },
              { name: '旋转角度切除', level: 'key' }
            ]},
            { id: '3.1.3', name: '倒角与圆角', points: [
              { name: '多类型倒角创建', level: 'key' },
              { name: '恒定半径圆角', level: 'core' }
            ]},
            { id: '3.1.4', name: '孔特征设计', points: [
              { name: '简单直孔定位', level: 'key' },
              { name: '异形标准孔参数', level: 'key' }
            ]},
            { id: '3.1.5', name: '筋与抽壳特征', points: [
              { name: '筋特征创建', level: 'key' },
              { name: '抽壳操作', level: 'know' }
            ]},
            { id: '3.1.6', name: '拔模与装饰螺纹', points: [
              { name: '拔模斜度设置', level: 'normal' },
              { name: '装饰螺纹线', level: 'normal' }
            ]}
          ]
        },
        {
          id: '3.2', name: '高级实体特征', groups: [
            { id: '3.2.1', name: '实体变换操作', points: [
              { name: '实体平移复制', level: 'know' },
              { name: '实体旋转变换', level: 'know' }
            ]},
            { id: '3.2.2', name: '特征阵列操作', points: [
              { name: '线性圆周阵列', level: 'core' },
              { name: '草图驱动填充阵列', level: 'know' }
            ]},
            { id: '3.2.3', name: '特征镜像操作', points: [
              { name: '基准面镜像特征', level: 'key' },
              { name: '镜像功能应用', level: 'normal' }
            ]},
            { id: '3.2.4', name: '扫描特征', points: [
              { name: '扫描特征要素', level: 'key' },
              { name: '扫描特征操作', level: 'normal' }
            ]},
            { id: '3.2.5', name: '放样特征', points: [
              { name: '放样特征要素', level: 'key' },
              { name: '放样特征操作', level: 'normal' }
            ]}
          ]
        },
        {
          id: '3.3', name: '零件相关知识', groups: [
            { id: '3.3.1', name: '零件基础属性', points: [
              { name: '零件材质选用', level: 'normal' },
              { name: '零件单位修改', level: 'know' }
            ]},
            { id: '3.3.2', name: '参考几何体', points: [
              { name: '基准面轴创建', level: 'core' },
              { name: '基准点坐标系', level: 'optional' }
            ]},
            { id: '3.3.3', name: '特征编辑', points: [
              { name: '特征尺寸修改', level: 'key' },
              { name: '特征草图重定义', level: 'core' },
              { name: '特征父子关系', level: 'normal' },
              { name: '设计树认识', level: 'core' },
              { name: '特征删除处理', level: 'normal' },
              { name: '特征排序插入', level: 'normal' },
              { name: '特征失败修复', level: 'know' }
            ]}
          ]
        }
      ]
    },
    {
      id: 4, name: '装配体设计', color: '#534AB7',
      sections: [
        {
          id: '4.1', name: '装配体基础设计', groups: [
            { id: '4.1.1', name: '装配配合约束', points: [
              { name: '基础配合类型', level: 'core' }
            ]},
            { id: '4.1.2', name: '零部件编辑管理', points: [
              { name: '装配创建流程', level: 'normal' },
              { name: '装配环境零件修改', level: 'key' },
              { name: '零件状态管理', level: 'key' }
            ]},
            { id: '4.1.3', name: '装配视图与检测', points: [
              { name: '显示状态切换', level: 'normal' },
              { name: '爆炸视图创建', level: 'normal' },
              { name: '装配干涉检查', level: 'core' }
            ]}
          ]
        }
      ]
    },
    {
      id: 5, name: '工程图设计', color: '#A32D2D',
      sections: [
        {
          id: '5.1', name: '工程图设计', groups: [
            { id: '5.1', name: '视图创建', points: [
              { name: '基本辅助视图', level: 'core' },
              { name: '剖视图创建', level: 'core' },
              { name: '局部放大断裂视图', level: 'normal' }
            ]}
          ]
        },
        {
          id: '5.2', name: '标注与出图设置', groups: [
            { id: '5.2', name: '标注与出图', points: [
              { name: '尺寸公差标注', level: 'core' },
              { name: '粗糙度形位公差', level: 'normal' },
              { name: '技术要求标注', level: 'normal' }
            ]}
          ]
        }
      ]
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KNOWLEDGE_GRAPH, LEVEL_META };
}
