"use client";

import React, { useState } from "react";
import { Table, Button, Input, Space, Tag, Dropdown, MenuProps, Modal, Drawer, Form, Select, Avatar, Card } from "antd";
import { SearchOutlined, PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined } from "@ant-design/icons";

const { Option } = Select;

interface Client {
  key: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  avatar?: string;
}

const initialData: Client[] = [
  { key: "1", name: "Alice Smith", email: "alice@example.com", status: "Active", plan: "Pro" },
  { key: "2", name: "Bob Johnson", email: "bob@example.com", status: "Inactive", plan: "Starter" },
  { key: "3", name: "Charlie Davis", email: "charlie@example.com", status: "Active", plan: "Enterprise" },
];

export default function ClientsPage() {
  const [data, setData] = useState<Client[]>(initialData);
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form] = Form.useForm();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearchText(value);
    const filteredData = initialData.filter((client) =>
      client.name.toLowerCase().includes(value) || client.email.toLowerCase().includes(value)
    );
    setData(filteredData);
  };

  const showModal = (client?: Client) => {
    if (client) {
      form.setFieldsValue(client);
      setSelectedClient(client);
    } else {
      form.resetFields();
      setSelectedClient(null);
    }
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (selectedClient) {
        const newData = data.map((item) =>
          item.key === selectedClient.key ? { ...item, ...values } : item
        );
        setData(newData);
      } else {
        setData([...data, { key: Date.now().toString(), ...values }]);
      }
      setIsModalVisible(false);
    });
  };

  const handleDelete = (key: string) => {
    Modal.confirm({
      title: "Are you sure you want to delete this client?",
      onOk: () => {
        setData(data.filter((item) => item.key !== key));
      },
    });
  };

  const showDrawer = (client: Client) => {
    setSelectedClient(client);
    setIsDrawerVisible(true);
  };

  const columns = [
    {
      title: "Client",
      dataIndex: "name",
      key: "name",
      sorter: (a: Client, b: Client) => a.name.localeCompare(b.name),
      render: (text: string, record: Client) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.avatar} />
          {text}
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Active", value: "Active" },
        { text: "Inactive", value: "Inactive" },
      ],
      onFilter: (value: any, record: Client) => record.status === value,
      render: (status: string) => (
        <Tag color={status === "Active" ? "green" : "red"}>{status}</Tag>
      ),
    },
    {
      title: "Plan",
      dataIndex: "plan",
      key: "plan",
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: Client) => {
        const items: MenuProps["items"] = [
          {
            key: "view",
            icon: <EyeOutlined />,
            label: "View Details",
            onClick: () => showDrawer(record),
          },
          {
            key: "edit",
            icon: <EditOutlined />,
            label: "Edit",
            onClick: () => showModal(record),
          },
          {
            key: "delete",
            icon: <DeleteOutlined />,
            label: "Delete",
            danger: true,
            onClick: () => handleDelete(record.key),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <Card title={<h2 style={{ margin: 0, fontSize: 20 }}>Clients Management</h2>} variant="borderless" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <Input
          placeholder="Search clients..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={handleSearch}
          style={{ width: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          Add Client
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={selectedClient ? "Edit Client" : "Add Client"}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Please input the name!" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Please input a valid email!" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: "Please select a status!" }]}>
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
          <Form.Item name="plan" label="Plan" rules={[{ required: true, message: "Please select a plan!" }]}>
            <Select>
              <Option value="Starter">Starter</Option>
              <Option value="Pro">Pro</Option>
              <Option value="Enterprise">Enterprise</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Client Details"
        placement="right"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
      >
        {selectedClient && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar size={80} icon={<UserOutlined />} src={selectedClient.avatar} style={{ marginBottom: 16 }} />
            <h3>{selectedClient.name}</h3>
            <p style={{ color: "gray" }}>{selectedClient.email}</p>
            <div style={{ width: '100%', marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Status:</strong>
                <Tag color={selectedClient.status === "Active" ? "green" : "red"}>{selectedClient.status}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <strong>Plan:</strong>
                <span>{selectedClient.plan}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </Card>
  );
}

