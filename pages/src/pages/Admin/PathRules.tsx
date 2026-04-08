/**
 * 路径规则管理页面
 * 
 * 功能：管理路径的权限、加密、压缩配置
 * 对应后端 /@mates 接口
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, Switch, Tag, Tooltip, Typography, Popconfirm, message,
  Drawer, Descriptions, Badge, Divider, Row, Col, Checkbox,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined,
  FileZipOutlined, EyeInvisibleOutlined, ShareAltOutlined,
  ReloadOutlined, InfoCircleOutlined, NodeIndexOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../../posts/api';

const { Title, Text } = Typography;

// 权限位定义
const MASK_BITS = {
  ATTR_ENCRYPTED: 0x8000,
  ATTR_NAME_ENC: 0x4000,
  ATTR_COMPRESSED: 0x2000,
  OWNER_DOWNLOAD: 0x0800,
  OWNER_WRITE: 0x0400,
  OWNER_DELETE: 0x0200,
  GROUP_DOWNLOAD: 0x0080,
  GROUP_WRITE: 0x0040,
  GROUP_DELETE: 0x0020,
  OTHER_DOWNLOAD: 0x0008,
  OTHER_WRITE: 0x0004,
  OTHER_DELETE: 0x0002,
};

interface PathRuleItem {
  mates_name: string;
  mates_mask: number;
  mates_user: number;
  is_enabled: number;
  dir_hidden: number;
  dir_shared: number;
  set_zipped: string;
  set_parted: string;
  crypt_name: string;
  cache_time: number;
}

const PathRules: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PathRuleItem[]>([]);
  const [editVisible, setEditVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PathRuleItem | null>(null);
  const [cryptGroups, setCryptGroups] = useState<{ crypt_name: string }[]>([]);
  const [form] = Form.useForm();

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
    const data = await api.get('/api/admin/meta/list');
      setDataSource(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error(t('common.failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // 加载加密组列表
  const fetchCryptGroups = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/setting/list?group=crypt');
      setCryptGroups(Array.isArray(data) ? data : []);
    } catch { /* 忽略 */ }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCryptGroups();
  }, [fetchData, fetchCryptGroups]);

  // 打开编辑
  const handleEdit = (item?: PathRuleItem) => {
    setEditingItem(item || null);
    if (item) {
      form.setFieldsValue({
        ...item,
        // 解析权限位为checkbox组
        attr_encrypted: !!(item.mates_mask & MASK_BITS.ATTR_ENCRYPTED),
        attr_name_enc: !!(item.mates_mask & MASK_BITS.ATTR_NAME_ENC),
        attr_compressed: !!(item.mates_mask & MASK_BITS.ATTR_COMPRESSED),
        owner_download: !!(item.mates_mask & MASK_BITS.OWNER_DOWNLOAD),
        owner_write: !!(item.mates_mask & MASK_BITS.OWNER_WRITE),
        owner_delete: !!(item.mates_mask & MASK_BITS.OWNER_DELETE),
        group_download: !!(item.mates_mask & MASK_BITS.GROUP_DOWNLOAD),
        group_write: !!(item.mates_mask & MASK_BITS.GROUP_WRITE),
        group_delete: !!(item.mates_mask & MASK_BITS.GROUP_DELETE),
        other_download: !!(item.mates_mask & MASK_BITS.OTHER_DOWNLOAD),
        other_write: !!(item.mates_mask & MASK_BITS.OTHER_WRITE),
        other_delete: !!(item.mates_mask & MASK_BITS.OTHER_DELETE),
      });
    } else {
      form.resetFields();
      // 默认值：所有者全部权限
      form.setFieldsValue({
        is_enabled: 1,
        dir_hidden: 0,
        dir_shared: 0,
        cache_time: 0,
        mates_user: 0,
        owner_download: true,
        owner_write: true,
        owner_delete: true,
      });
    }
    setEditVisible(true);
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 构建权限掩码
      let mask = 0;
      if (values.attr_encrypted) mask |= MASK_BITS.ATTR_ENCRYPTED;
      if (values.attr_name_enc) mask |= MASK_BITS.ATTR_NAME_ENC;
      if (values.attr_compressed) mask |= MASK_BITS.ATTR_COMPRESSED;
      if (values.owner_download) mask |= MASK_BITS.OWNER_DOWNLOAD;
      if (values.owner_write) mask |= MASK_BITS.OWNER_WRITE;
      if (values.owner_delete) mask |= MASK_BITS.OWNER_DELETE;
      if (values.group_download) mask |= MASK_BITS.GROUP_DOWNLOAD;
      if (values.group_write) mask |= MASK_BITS.GROUP_WRITE;
      if (values.group_delete) mask |= MASK_BITS.GROUP_DELETE;
      if (values.other_download) mask |= MASK_BITS.OTHER_DOWNLOAD;
      if (values.other_write) mask |= MASK_BITS.OTHER_WRITE;
      if (values.other_delete) mask |= MASK_BITS.OTHER_DELETE;

      const payload = {
        mates_name: values.mates_name,
        mates_mask: mask,
        mates_user: values.mates_user || 0,
        is_enabled: values.is_enabled ? 1 : 0,
        dir_hidden: values.dir_hidden ? 1 : 0,
        dir_shared: values.dir_shared ? 1 : 0,
        set_zipped: values.set_zipped || '',
        set_parted: values.set_parted || '',
        crypt_name: values.crypt_name || '',
        cache_time: values.cache_time || 0,
      };

      const url = editingItem
        ? '/api/admin/meta/update'
        : '/api/admin/meta/create';

      await api.post(url, payload);
      message.success(t('common.success'));
      setEditVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || t('common.failed'));
    }
  };

  // 删除
  const handleDelete = async (name: string) => {
    try {
      await api.post('/api/admin/meta/delete', { mates_name: name });
      message.success(t('common.success'));
      fetchData();
    } catch (err: any) {
      message.error(err.message || t('common.failed'));
    }
  };

  // 渲染权限标签
  const renderMaskTags = (mask: number) => {
    const tags: React.ReactNode[] = [];
    if (mask & MASK_BITS.ATTR_ENCRYPTED) tags.push(<Tag key="enc" color="red"><LockOutlined /> {t('common.encrypt')}</Tag>);
    if (mask & MASK_BITS.ATTR_COMPRESSED) tags.push(<Tag key="zip" color="orange"><FileZipOutlined /> {t('common.unzip')}</Tag>);
    if (mask & MASK_BITS.OWNER_DOWNLOAD) tags.push(<Tag key="od" color="blue">主↓</Tag>);
    if (mask & MASK_BITS.OWNER_WRITE) tags.push(<Tag key="ow" color="blue">主↑</Tag>);
    if (mask & MASK_BITS.GROUP_DOWNLOAD) tags.push(<Tag key="gd" color="cyan">组↓</Tag>);
    if (mask & MASK_BITS.OTHER_DOWNLOAD) tags.push(<Tag key="pd" color="green">公↓</Tag>);
    return tags.length > 0 ? tags : <Text type="secondary">—</Text>;
  };

  const columns = [
    {
      title: t('mates.pathName'),
      dataIndex: 'mates_name',
      key: 'mates_name',
      width: 200,
      render: (text: string) => (
        <Space>
          <NodeIndexOutlined />
          <Text strong style={{ fontFamily: "'Space Grotesk', monospace" }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: t('mates.pathMask'),
      dataIndex: 'mates_mask',
      key: 'mates_mask',
      width: 280,
      render: (mask: number) => renderMaskTags(mask),
    },
    {
      title: t('mates.cryptGroup'),
      dataIndex: 'crypt_name',
      key: 'crypt_name',
      width: 140,
      render: (text: string) => text ? <Tag color="volcano"><LockOutlined /> {text}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: t('common.status'),
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 80,
      render: (val: number) => (
        <Badge status={val ? 'success' : 'default'} text={val ? t('common.enabled') : t('common.disabled')} />
      ),
    },
    {
      title: '',
      key: 'extra',
      width: 80,
      render: (_: any, record: PathRuleItem) => (
        <Space size={0}>
          {record.dir_hidden ? <Tooltip title={t('mates.hidden')}><EyeInvisibleOutlined style={{ opacity: 0.5 }} /></Tooltip> : null}
          {record.dir_shared ? <Tooltip title={t('mates.shared')}><ShareAltOutlined style={{ opacity: 0.5 }} /></Tooltip> : null}
        </Space>
      ),
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 140,
      render: (_: any, record: PathRuleItem) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title={t('mates.deleteMates')}
            onConfirm={() => handleDelete(record.mates_name)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <Card
        title={
          <Space>
            <NodeIndexOutlined />
            <span>{t('sidebar.pathRules')}</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>{t('common.refresh')}</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEdit()}>
              {t('mates.createMates')}
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          rowKey="mates_name"
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 编辑抽屉 */}
      <Drawer
        title={editingItem ? t('mates.editMates') : t('mates.createMates')}
        width={560}
        open={editVisible}
        onClose={() => setEditVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setEditVisible(false)}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleSave}>{t('common.save')}</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="mates_name"
            label={t('mates.pathName')}
            rules={[{ required: true, message: '请输入路径名称' }]}
            tooltip="如 /path/to/dir/ — 以 / 开头和结尾"
          >
            <Input
              prefix={<NodeIndexOutlined />}
              placeholder="/path/to/dir/"
              disabled={!!editingItem}
              style={{ fontFamily: "'Space Grotesk', monospace" }}
            />
          </Form.Item>

          <Divider orientation="left">属性标记</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="attr_encrypted" valuePropName="checked">
                <Checkbox><LockOutlined /> 加密文件</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="attr_name_enc" valuePropName="checked">
                <Checkbox><LockOutlined /> 加密文件名</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="attr_compressed" valuePropName="checked">
                <Checkbox><FileZipOutlined /> 压缩文件</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">所有者权限</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="owner_download" valuePropName="checked">
                <Checkbox>允许下载</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="owner_write" valuePropName="checked">
                <Checkbox>允许写入</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="owner_delete" valuePropName="checked">
                <Checkbox>允许删除</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">用户组权限</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="group_download" valuePropName="checked">
                <Checkbox>允许下载</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="group_write" valuePropName="checked">
                <Checkbox>允许写入</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="group_delete" valuePropName="checked">
                <Checkbox>允许删除</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">其他人权限</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="other_download" valuePropName="checked">
                <Checkbox>允许下载</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="other_write" valuePropName="checked">
                <Checkbox>允许写入</Checkbox>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="other_delete" valuePropName="checked">
                <Checkbox>允许删除</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">安全与缓存</Divider>
          
          <Form.Item name="crypt_name" label={t('mates.cryptGroup')}>
            <Select allowClear placeholder="选择加密组（可选）">
              {cryptGroups.map(g => (
                <Select.Option key={g.crypt_name} value={g.crypt_name}>
                  <LockOutlined /> {g.crypt_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="is_enabled" valuePropName="checked" label={t('common.status')}>
                <Switch checkedChildren={t('common.enabled')} unCheckedChildren={t('common.disabled')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dir_hidden" valuePropName="checked" label={t('mates.hidden')}>
                <Switch checkedChildren="隐藏" unCheckedChildren="显示" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dir_shared" valuePropName="checked" label={t('mates.shared')}>
                <Switch checkedChildren="允许" unCheckedChildren="禁止" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="cache_time" label={t('mates.cacheTime')} tooltip="缓存时间（秒），0表示不缓存">
            <InputNumber min={0} max={86400} style={{ width: '100%' }} placeholder="0" addonAfter="秒" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default PathRules;
